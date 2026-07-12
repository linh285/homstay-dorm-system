import { handleUnauthorizedResponse } from '../features/auth/auth-session';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T; meta: null }
  | { success: false; error: { code: string; message: string } };

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) {
    return null as T;
  }
  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.success) {
    const error =
      'error' in body
        ? body.error
        : { code: 'REQUEST_FAILED', message: 'Yêu cầu không thành công.' };
    if (response.status === 401 && path !== '/auth/login') {
      handleUnauthorizedResponse();
    }
    throw new ApiError(error.code, error.message);
  }
  return body.data;
}
