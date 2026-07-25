async function saveProfile() {
  const name = document.getElementById('u-name').value.trim();
  const phone = document.getElementById('u-phone').value.trim();
  const errorElement = document.getElementById('profile-err');

  if (!name) {
    errorElement.textContent = 'Please enter your name to continue.';
    errorElement.style.display = 'block';
    return;
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    errorElement.textContent = 'Contact number must be exactly 10 digits.';
    errorElement.style.display = 'block';
    return;
  }
  const ageRaw = document.getElementById('u-age').value.trim();
  if (ageRaw !== '' && (!Number.isInteger(+ageRaw) || +ageRaw < 1 || +ageRaw > 99)) {
    errorElement.textContent = 'Age must be a number between 1 and 99.';
    errorElement.style.display = 'block';
    return;
  }
  const monthsNum = Number(document.getElementById('u-months').value) || 3;
  if (monthsNum < 1 || monthsNum > 24) {
    errorElement.textContent = 'Program duration must be between 1 and 24 months.';
    errorElement.style.display = 'block';
    return;
  }

  errorElement.style.display = 'none';
  const profile = {
    name,
    age: ageRaw,
    email: document.getElementById('u-email').value.trim(),
    phone,
    weeks: Math.max(1, Math.round(monthsNum * 4)), // months entered, tracked weekly (4 wks/mo)
    checkinDay: document.getElementById('u-checkinday').value.trim(),
  };

  try {
    const clientId = getCurrentClientId();
    if (clientId === DEFAULT_CLIENT_ID) {
      const result = await api.createClient(profile);
      saveCurrentClientId(result.client.id);
      currentUser = result.client;
      currentHistory = [];
      currentCustomDefs = {habit: [], ritual: []};
    } else {
      await api.updateClient(clientId, profile);
      currentUser = {...currentUser, ...profile};
    }

    document.getElementById('sidebar-user').textContent = name;
    updateWelcomeChoice();
    buildOverview();
    if (ADMIN_MODE) await buildAdminDashboard();
    goTo('q1');
  } catch (error) {
    console.error(error);
    // Surface validation / duplicate-phone messages from the server inline.
    if (error.status === 400 || error.status === 409) {
      errorElement.textContent = error.message;
      errorElement.style.display = 'block';
    } else {
      showError('Profile could not be saved. Please try again.');
    }
  }
}

function continueExistingUser() {
  goTo(getUser() ? 'q1' : 'profile');
}

function startNewUser() {
  if (!confirm('Start a new user profile? This will clear the current profile and weekly history on this device.')) return;
  saveCurrentClientId(DEFAULT_CLIENT_ID);
  resetClientState();
  if (lineChartInst) {
    lineChartInst.destroy();
    lineChartInst = null;
  }
  document.getElementById('sidebar-user').textContent = '—';
  document.getElementById('ret-banner').style.display = 'none';
  document.getElementById('welcome-return-choice').style.display = 'none';
  document.getElementById('welcome-start-btn').style.display = 'inline-flex';
  populateProfileFields({});
  renderCustomItems();
  buildOverview();
  buildProgress();
  goTo('profile');
}

function updateWelcomeChoice() {
  const choice = document.getElementById('welcome-return-choice');
  const startButton = document.getElementById('welcome-start-btn');
  if (!choice || !startButton) return;
  const hasUser = !!getUser();
  choice.style.display = hasUser ? 'grid' : 'none';
  startButton.style.display = hasUser ? 'none' : 'inline-flex';
}

function populateProfileFields(user = {}) {
  document.getElementById('u-name').value = user.name || '';
  document.getElementById('u-age').value = user.age || '';
  document.getElementById('u-email').value = user.email || '';
  document.getElementById('u-phone').value = user.phone || '';
  document.getElementById('u-months').value = Math.max(1, Math.round((user.weeks || 12) / 4));
  document.getElementById('u-checkinday').value = user.checkinDay || '';
}

async function createNewClient() {
  try {
    const result = await api.createClient({
      name: 'New Client', age: '', email: '', phone: '', weeks: 12, checkinDay: '',
    });
    saveCurrentClientId(result.client.id);
    await loadClientState(result.client.id);
    populateProfileFields(currentUser);
    await buildAdminDashboard();
    goTo('profile');
  } catch (error) {
    console.error(error);
    showError('Unable to create client.');
  }
}

async function getCurrentUser() {
  if (currentUser) return currentUser;
  return loadClientState();
}
