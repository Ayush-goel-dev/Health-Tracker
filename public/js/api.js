/* HTTP boundary for all Google Sheets-backed application data. */
async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    cache: 'no-store', // always fetch fresh data — no stale reads from the browser cache
    ...options,
    headers: {
      ...(options.body ? {'Content-Type': 'application/json'} : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

const api = {
  getClients: () => apiRequest('/api/clients'),
  getClient: id => apiRequest(`/api/clients/${encodeURIComponent(id)}`),
  createClient: client => apiRequest('/api/clients', {
    method: 'POST',
    body: JSON.stringify(client),
  }),
  updateClient: (id, client) => apiRequest(`/api/clients/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(client),
  }),
  deleteClient: id => apiRequest(`/api/clients/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  getSubmissions: id => apiRequest(`/api/submissions/${encodeURIComponent(id)}`),
  createSubmission: submission => apiRequest('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  }),
  clearSubmissions: id => apiRequest(`/api/submissions/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  getPreferences: id => apiRequest(`/api/clients/${encodeURIComponent(id)}/preferences`),
  updatePreferences: (id, customDefs) => apiRequest(`/api/clients/${encodeURIComponent(id)}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({customDefs}),
  }),
};
