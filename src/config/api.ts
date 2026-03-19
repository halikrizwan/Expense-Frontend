// Dev: localhost for simulator, Mac IP for physical device.
// Prod: your deployed API URL. Empty = auto-detect from Metro host.
export const API_BASE_URL_OVERRIDE = __DEV__ ? 'http://192.168.1.194:4000/v1' : '';
