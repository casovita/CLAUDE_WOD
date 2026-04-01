import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/api';

export function useGmailAuth() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(!!localStorage.getItem('gm_access_token'));
  }, []);

  const connect = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const disconnect = () => {
    localStorage.removeItem('gm_access_token');
    localStorage.removeItem('gm_refresh_token');
    setConnected(false);
  };

  const saveTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('gm_access_token', accessToken);
    if (refreshToken) localStorage.setItem('gm_refresh_token', refreshToken);
    setConnected(true);
  };

  return { connected, connect, disconnect, saveTokens };
}
