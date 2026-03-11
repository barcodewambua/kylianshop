// assets/js/api.js — Shared API helper for KylianShop
// All fetch calls to the backend go through here.

const API_BASE = 'http://localhost:3001/api';

/**
 * Wrapper around fetch that:
 *  - Prefixes the base URL
 *  - Sets JSON headers
 *  - Attaches the stored JWT token if present
 *  - Parses the JSON response
 *  - Throws a descriptive Error on non-2xx responses
 *
 * @param {string} path   e.g. '/products' or '/orders'
 * @param {object} opts   standard fetch options (method, body, etc.)
 */
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('kylian_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // Try to parse JSON regardless of status so we can read error messages
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/** Shorthand helpers */
const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
};

// Make available globally (no bundler)
window.api = api;
