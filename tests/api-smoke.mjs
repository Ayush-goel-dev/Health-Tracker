import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
const request = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {...(options.body ? {'content-type': 'application/json'} : {}), ...options.headers},
  });
  const body = await response.json();
  assert.equal(response.ok, true, body.error || `${path} returned ${response.status}`);
  return body;
};

let clientId;
try {
  const created = await request('/api/clients', {
    method: 'POST',
    body: JSON.stringify({name: 'API Smoke Test', email: 'smoke@example.com', phone: '9999999999', age: '30', weeks: 12, checkinDay: 'Sunday'}),
  });
  clientId = created.client.id;

  await request(`/api/clients/${clientId}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({customDefs: {habit: [{id: 'habit_test', name: 'Hydration'}], ritual: []}}),
  });
  const preferences = await request(`/api/clients/${clientId}/preferences`);
  assert.equal(preferences.customDefs.habit[0].name, 'Hydration');

  await request('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({clientId, q1: {energy: 8}, q2: {sleepq: 7}, q3: {winBiggest: 'Tested'}, consistency: 75, date: 'Jul 5, 2026', dateISO: '2026-07-05T12:00:00.000Z', goals: {sleep: 70}, customAvg: 80, filledCustoms: []}),
  });
  const submissions = await request(`/api/submissions/${clientId}`);
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].q1.energy, 8);

  await request(`/api/submissions/${clientId}`, {method: 'DELETE'});
  assert.deepEqual(await request(`/api/submissions/${clientId}`), []);
  console.log('API lifecycle smoke test passed');
} finally {
  if (clientId) await request(`/api/clients/${clientId}`, {method: 'DELETE'});
}
