import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api';

export function useGmailAuth() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(!!localStorage.getItem('gm_access_token'));
  }, []);

  const connect = useCallback(() => {
    window.location.href = `${API_BASE}/auth/google`;
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('gm_access_token');
    localStorage.removeItem('gm_refresh_token');
    setConnected(false);
  }, []);

  const saveTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('gm_access_token', accessToken);
    if (refreshToken) localStorage.setItem('gm_refresh_token', refreshToken);
    setConnected(true);
  }, []);

  return { connected, connect, disconnect, saveTokens };
}
