import { handleUnauthorizedResponse } from '../features/auth/auth-session';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ApiSuccessEnvelope<T, TMeta = null> = {
  success: true;
  data: T;
  meta: TMeta;
};

type ApiEnvelope<T, TMeta = null> =
  | ApiSuccessEnvelope<T, TMeta>
  | { success: false; error: { code: string; message: string } };

async function requestEnvelope<T, TMeta = null>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T, TMeta>> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) {
    return { success: true, data: null as T, meta: null as TMeta };
  }
  const body = (await response.json()) as ApiEnvelope<T, TMeta>;

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
  return body;
}

export async function apiClientEnvelope<T, TMeta = null>(
  path: string,
  options: RequestInit = {},
): Promise<ApiSuccessEnvelope<T, TMeta>> {
  return (await requestEnvelope<T, TMeta>(path, options)) as ApiSuccessEnvelope<
    T,
    TMeta
  >;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const body = await requestEnvelope<T>(path, options);
  if (!body.success) return null as T;
  return body.data;
}
