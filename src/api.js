const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Returns a fetch wrapper bound to a token. A 401 on an authenticated call signs the admin out.
export function createApi(token, onUnauthorized) {
  return async function api(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
      });
    } catch {
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) { onUnauthorized?.(); throw new ApiError('Your session has expired. Please sign in again.', 401); }
    if (!res.ok) {
      // 5xx responses carry a request id: search for it in System to find the matching log entry.
      const ref = data.requestId ? ` (ref ${data.requestId})` : '';
      throw new ApiError((data.message || `Request failed (${res.status})`) + ref, res.status);
    }
    return data;
  };
}

