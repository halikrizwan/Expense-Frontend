import { NativeModules, Platform } from 'react-native';
import { API_BASE_URL_OVERRIDE } from '../config/api';

const API_PORT = 4000;
const API_PREFIX = '/v1';

const getMetroHost = (): string | null => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return null;

  try {
    const parsed = new URL(scriptURL);
    return parsed.hostname || null;
  } catch {
    return null;
  }
};

const buildCandidateBaseUrls = () => {
  const metroHost = getMetroHost();
  const candidates: string[] = [];

  if (API_BASE_URL_OVERRIDE) {
    candidates.push(API_BASE_URL_OVERRIDE);
  }

  if (metroHost) {
    candidates.push(`http://${metroHost}:${API_PORT}${API_PREFIX}`);
  }

  if (Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:${API_PORT}${API_PREFIX}`);
    candidates.push(`http://localhost:${API_PORT}${API_PREFIX}`);
  } else {
    candidates.push(`http://localhost:${API_PORT}${API_PREFIX}`);
  }

  // Keep first occurrence only.
  return [...new Set(candidates)];
};

const BASE_URL_CANDIDATES = buildCandidateBaseUrls();
let activeBaseUrl = BASE_URL_CANDIDATES[0];

let accessToken = '';
let refreshHandler: null | (() => Promise<string | null>) = null;
let refreshInFlight: Promise<string | null> | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;
export const setRefreshHandler = (handler: null | (() => Promise<string | null>)) => {
  refreshHandler = handler;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiValidationIssue = {
  path?: string | string[];
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizePath = (path: ApiValidationIssue['path']) => {
  if (Array.isArray(path)) {
    return path.filter(Boolean).join('.');
  }

  return typeof path === 'string' ? path : '';
};

const formatValidationIssue = (issue: ApiValidationIssue) => {
  const path = normalizePath(issue.path);
  const message = typeof issue.message === 'string' ? issue.message.trim() : '';

  if (path && message) return `${path}: ${message}`;
  if (message) return message;
  if (path) return path;
  return '';
};

const readValidationIssues = (value: unknown): ApiValidationIssue[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map(issue => ({
    path: Array.isArray(issue.path) || typeof issue.path === 'string' ? (issue.path as ApiValidationIssue['path']) : undefined,
    message: typeof issue.message === 'string' ? issue.message : undefined,
  }));
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const formatValidationIssues = (issues: ApiValidationIssue[]) => {
  const lines = issues
    .map(formatValidationIssue)
    .filter(Boolean);

  return lines.length ? lines.join('\n') : null;
};

const getApiErrorMessage = (payload: unknown) => {
  if (!isRecord(payload)) {
    return 'Request failed.';
  }

  const directIssues = readValidationIssues(payload.errors);
  const directMessage = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (directIssues.length) {
    return formatValidationIssues(directIssues) || directMessage || 'Request failed.';
  }

  if (directMessage) {
    const parsedMessage = tryParseJson(directMessage);

    if (isRecord(parsedMessage)) {
      const parsedIssues = readValidationIssues(parsedMessage.errors ?? parsedMessage.issues ?? parsedMessage.message);
      const formattedParsedIssues = formatValidationIssues(parsedIssues);
      if (formattedParsedIssues) {
        return formattedParsedIssues;
      }
    }

    if (Array.isArray(parsedMessage)) {
      const parsedIssues = readValidationIssues(parsedMessage);
      const formattedParsedIssues = formatValidationIssues(parsedIssues);
      if (formattedParsedIssues) {
        return formattedParsedIssues;
      }
    }

    return directMessage;
  }

  return 'Request failed.';
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const run = async (baseUrl: string, tokenOverride?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    const token = tokenOverride ?? accessToken;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  };

  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  for (const candidate of [activeBaseUrl, ...BASE_URL_CANDIDATES.filter(url => url !== activeBaseUrl)]) {
    try {
      response = await run(candidate);
      activeBaseUrl = candidate;
      break;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (!response) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot reach backend. Start server and verify one of: ${BASE_URL_CANDIDATES.join(', ')}. ${lastNetworkError instanceof Error ? lastNetworkError.message : ''}`.trim(),
    );
  }

  if (
    response.status === 401 &&
    refreshHandler &&
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    path !== '/auth/signup'
  ) {
    refreshInFlight ||= refreshHandler().finally(() => {
      refreshInFlight = null;
    });
    const refreshedToken = await refreshInFlight;
    if (refreshedToken) {
      response = await run(activeBaseUrl, refreshedToken);
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code || 'API_ERROR',
      getApiErrorMessage(payload),
    );
  }

  return payload as T;
};
