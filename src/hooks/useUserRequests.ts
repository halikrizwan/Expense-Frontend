import { useCallback, useState } from 'react';
import {
  acceptUserRequestApi,
  declineUserRequestApi,
  getUserRequestCountApi,
  getUserRequestsApi,
  sendUserRequestApi,
  UserRequest,
} from '../services/backend';

export const useUserRequests = () => {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    const data = await getUserRequestCountApi();
    setCount(data.count);
  }, []);

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getUserRequestsApi();
      setRequests(rows);
      setCount(rows.length);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendRequest = useCallback(async (targetUserId: string) => {
    await sendUserRequestApi(targetUserId);
  }, []);

  const acceptRequest = useCallback(async (requesterUserId: string) => {
    await acceptUserRequestApi(requesterUserId);
  }, []);

  const declineRequest = useCallback(async (requesterUserId: string) => {
    await declineUserRequestApi(requesterUserId);
  }, []);

  return {
    requests,
    count,
    loading,
    refreshCount,
    refreshRequests,
    sendRequest,
    acceptRequest,
    declineRequest,
  };
};
