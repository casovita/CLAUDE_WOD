export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const accessToken = localStorage.getItem('gm_access_token');
  const refreshToken = localStorage.getItem('gm_refresh_token');
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (refreshToken) headers['X-Refresh-Token'] = refreshToken;
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });

  // Silently update stored access token if the backend refreshed it
  const newToken = res.headers.get('X-New-Access-Token');
  if (newToken) {
    localStorage.setItem('gm_access_token', newToken);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export interface ExportSummary {
  messageId: string;
  subject: string;
  date: string;
  snippet: string;
}

export const uploadEml = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ count: number; workouts: unknown[] }>('/upload', { method: 'POST', body: form });
};

export const listGmailExports = () =>
  apiFetch<ExportSummary[]>('/gmail/exports');

export const fetchGmailExport = (messageId: string) =>
  apiFetch<{ count: number; workouts: unknown[] }>(`/gmail/exports/${messageId}`);
