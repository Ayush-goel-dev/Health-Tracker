/*
 * Browser storage is intentionally limited to the selected client identifier.
 * Profiles, preferences, and history below are an in-memory view of SQLite data.
 */
const CLIENT_ID_KEY = 'wpt_current_client';
const DEFAULT_CLIENT_ID = 'default';
const EMPTY_CUSTOM_DEFS = Object.freeze({habit: [], ritual: []});

let currentUser = null;
let currentHistory = [];
let currentCustomDefs = {habit: [], ritual: []};
let adminHistory = null;
let currentEntry = null;
let lineChartInst = null;

const getCurrentClientId = () => localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
const saveCurrentClientId = id => localStorage.setItem(CLIENT_ID_KEY, id || DEFAULT_CLIENT_ID);
const getUser = () => currentUser;
const getHistory = () => adminHistory || currentHistory;
const getCustomDefs = () => currentCustomDefs;

function resetClientState() {
  currentUser = null;
  currentHistory = [];
  currentCustomDefs = {habit: [], ritual: []};
  adminHistory = null;
  currentEntry = null;
}

async function loadClientState(clientId = getCurrentClientId()) {
  if (!clientId || clientId === DEFAULT_CLIENT_ID) {
    resetClientState();
    return null;
  }

  try {
    const [user, history, preferences] = await Promise.all([
      api.getClient(clientId),
      api.getSubmissions(clientId),
      api.getPreferences(clientId),
    ]);
    currentUser = user;
    currentHistory = history;
    currentCustomDefs = preferences.customDefs || {habit: [], ritual: []};
    adminHistory = null;
    return user;
  } catch (error) {
    if (error.status === 404) {
      saveCurrentClientId(DEFAULT_CLIENT_ID);
      resetClientState();
      return null;
    }
    throw error;
  }
}

async function saveCustomDefs(customDefs) {
  const clientId = getCurrentClientId();
  if (clientId === DEFAULT_CLIENT_ID) {
    currentCustomDefs = customDefs;
    return;
  }
  await api.updatePreferences(clientId, customDefs);
  currentCustomDefs = customDefs;
}
