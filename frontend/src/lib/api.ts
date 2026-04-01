import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({ baseURL: API_BASE });

// Attach stored tokens to every request
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('gm_access_token');
  const refreshToken = localStorage.getItem('gm_refresh_token');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (refreshToken) {
    config.headers['X-Refresh-Token'] = refreshToken;
  }
  return config;
});

export interface ExportSummary {
  messageId: string;
  subject: string;
  date: string;
  snippet: string;
}

export const uploadEml = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<{ count: number; workouts: unknown[] }>('/upload', form);
};

export const listGmailExports = () =>
  api.get<ExportSummary[]>('/gmail/exports');

export const fetchGmailExport = (messageId: string) =>
  api.get<{ count: number; workouts: unknown[] }>(`/gmail/exports/${messageId}`);
