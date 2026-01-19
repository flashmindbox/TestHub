import { APIRequestContext } from '@playwright/test';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export function createApiClient(request: APIRequestContext, config: ApiClientConfig) {
  const { baseUrl, defaultHeaders = {} } = config;

  async function handleResponse<T>(response: Awaited<ReturnType<typeof request.get>>): Promise<T> {
    const contentType = response.headers()['content-type'] || '';

    if (!response.ok()) {
      let errorMessage = `HTTP ${response.status()}`;
      if (contentType.includes('application/json')) {
        const body = await response.json() as ApiResponse;
        errorMessage = body.error?.message || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (contentType.includes('application/json')) {
      const body = await response.json() as ApiResponse<T>;
      if (!body.success && body.error) {
        throw new Error(body.error.message);
      }
      return body.data as T;
    }

    return await response.text() as unknown as T;
  }

  return {
    request,

    async get<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await request.get(`${baseUrl}${path}`, {
        headers: { ...defaultHeaders, ...options?.headers },
      });
      return handleResponse<T>(response);
    },

    async post<T>(path: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await request.post(`${baseUrl}${path}`, {
        data,
        headers: { ...defaultHeaders, ...options?.headers },
      });
      return handleResponse<T>(response);
    },

    async put<T>(path: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await request.put(`${baseUrl}${path}`, {
        data,
        headers: { ...defaultHeaders, ...options?.headers },
      });
      return handleResponse<T>(response);
    },

    async delete<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await request.delete(`${baseUrl}${path}`, {
        headers: { ...defaultHeaders, ...options?.headers },
      });
      return handleResponse<T>(response);
    },

    async patch<T>(path: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await request.patch(`${baseUrl}${path}`, {
        data,
        headers: { ...defaultHeaders, ...options?.headers },
      });
      return handleResponse<T>(response);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
