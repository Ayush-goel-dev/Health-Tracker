async function selectClient(clientId) {
  try {
    saveCurrentClientId(clientId);
    await loadClientState(clientId);
    populateProfileFields(currentUser);
    renderCustomItems();
    document.getElementById('sidebar-user').textContent = currentUser?.name || 'Client';
    await buildAdminDashboard();
    buildOverview();
    goTo('profile');
  } catch (error) {
    console.error(error);
    showError('Unable to select client.');
  }
}

async function viewClientDashboard(clientId) {
  try {
    const [client, submissions] = await Promise.all([
      api.getClient(clientId), api.getSubmissions(clientId),
    ]);
    adminHistory = submissions;
    document.getElementById('sidebar-user').textContent = client.name || 'Client';
    goTo('progress');
  } catch (error) {
    console.error(error);
    showError('Unable to load client data.');
  }
}

async function buildAdminDashboard() {
  const tableBody = document.getElementById('admin-client-table-body');
  if (!tableBody) return;

  try {
    const clients = await api.getClients();
    const currentClientId = getCurrentClientId();
    tableBody.innerHTML = clients.map(client => `
      <tr${client.id === currentClientId ? ' style="background:rgba(175,14,36,0.05);"' : ''}>
        <td>${esc(client.name || 'Unnamed')}</td>
        <td>${esc(client.email || '')}</td>
        <td>${esc(client.phone || '')}</td>
        <td>${client.submissionCount || 0}</td>
        <td>${client.lastSubmission ? esc(new Date(client.lastSubmission.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})) : '—'}</td>
        <td class="admin-row-action">
          <button class="btn btn-primary" onclick="selectClient('${client.id}')">Select</button>
          <button class="btn btn-ghost" onclick="viewClientDashboard('${client.id}')">View Dashboard</button>
          <button class="btn" style="background:#E50914;color:#fff;" onclick="deleteClient('${client.id}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--ink4)">No clients added yet.</td></tr>';

    const countElement = document.getElementById('admin-client-count');
    if (countElement) countElement.textContent = `Clients saved: ${clients.length}`;
    await showClientDetails(currentClientId);
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red">Unable to load clients.</td></tr>';
  }
}

async function deleteClient(clientId) {
  if (!confirm('Delete this client and all submissions?')) return;
  try {
    await api.deleteClient(clientId);
    if (getCurrentClientId() === clientId) {
      saveCurrentClientId(DEFAULT_CLIENT_ID);
      resetClientState();
      document.getElementById('sidebar-user').textContent = '—';
    }
    await buildAdminDashboard();
    buildOverview();
  } catch (error) {
    console.error(error);
    showError(error.message);
  }
}

async function showClientDetails(clientId) {
  const details = document.getElementById('admin-client-details');
  if (!clientId || clientId === DEFAULT_CLIENT_ID) {
    details.innerHTML = '<div class="empty-state">Select a client to view details.</div>';
    return;
  }

  try {
    const [client, submissions] = await Promise.all([
      api.getClient(clientId), api.getSubmissions(clientId),
    ]);
    const latest = submissions.at(-1) || null;
    details.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--ink2)">Client details: ${esc(client.name || 'Unnamed')}</div>
          <div style="font-size:12px;color:var(--ink4);margin-top:4px">${esc(client.email || 'No email')} · ${esc(client.phone || 'No phone')}</div>
        </div>
        <button class="btn btn-primary green" onclick="selectClient('${client.id}')">Edit Client</button>
      </div>
      <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px"><div style="font-size:10px;color:var(--ink4);text-transform:uppercase;letter-spacing:.12em">Check-ins</div><div style="font-size:22px;font-weight:700;color:var(--purple);margin-top:8px">${submissions.length}</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px"><div style="font-size:10px;color:var(--ink4);text-transform:uppercase;letter-spacing:.12em">Latest score</div><div style="font-size:22px;font-weight:700;color:var(--green);margin-top:8px">${latest ? esc(`${latest.consistency}%`) : '—'}</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px"><div style="font-size:10px;color:var(--ink4);text-transform:uppercase;letter-spacing:.12em">Last update</div><div style="font-size:22px;font-weight:700;color:var(--ink);margin-top:8px">${latest ? esc(latest.date) : '—'}</div></div>
      </div>
      <div style="margin-top:16px;font-size:12px;color:var(--ink3)">${latest ? esc(latest.q3?.winBiggest || 'No latest win recorded.') : 'No entries yet.'}</div>`;
  } catch (error) {
    console.error(error);
    details.innerHTML = '<div class="empty-state">Unable to load client details.</div>';
  }
}
