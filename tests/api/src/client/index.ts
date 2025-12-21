/**
 * Generic HTTP client for API contract testing
 *
 * Implementation-agnostic client that makes real HTTP requests
 * to the configured API server.
 */

import { API_BASE_URL } from './config';

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
  ok: boolean;
}

/**
 * API client for making HTTP requests to the LeanSpec server
 */
export const apiClient = {
  baseUrl: API_BASE_URL,

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, String(v));
        }
      });
    }

    const res = await fetch(url.toString());
    const data = await res.json().catch(() => null);

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: data as T,
      ok: res.ok,
    };
  },

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: data as T,
      ok: res.ok,
    };
  },

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: data as T,
      ok: res.ok,
    };
  },

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: 'DELETE',
    });

    // DELETE may return 204 No Content
    const data = res.status === 204 ? null : await res.json().catch(() => null);

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: data as T,
      ok: res.ok,
    };
  },
};

export default apiClient;
