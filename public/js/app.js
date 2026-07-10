const ADMIN_MODE = new URLSearchParams(window.location.search).get('admin') === '1';
const ALL_PAGES = ['welcome', 'profile', 'q1', 'q2', 'progress', 'admin'];
const NAV_MAP = {
  welcome: 'nav-welcome', profile: 'nav-profile', q1: 'nav-q1',
  q2: 'nav-q2', progress: 'nav-progress', admin: 'nav-admin',
};

function goTo(page) {
  ALL_PAGES.forEach(candidate => {
    document.getElementById(`page-${candidate}`).classList.toggle('active', candidate === page);
    const navItem = document.getElementById(NAV_MAP[candidate]);
    if (!navItem) return;
    navItem.classList.remove('active', 'active-green', 'active-orange');
    if (candidate !== page) return;
    if (candidate === 'q2') navItem.classList.add('active-green');
    else if (candidate === 'admin') navItem.classList.add('active-orange');
    else navItem.classList.add('active');
  });

  if (page === 'progress') buildProgress();
  if (page === 'admin') buildAdminDashboard();
  if (page === 'q1' || page === 'profile') adminHistory = null;
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function gotoIfReady(page) {
  goTo(!getUser() && !['welcome', 'profile', 'admin'].includes(page) ? 'profile' : page);
}

// Personalized dashboard greeting on the home screen.
function renderGreeting(user, history, week, totalWeeks) {
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const latest = history.length ? history[history.length - 1] : null;
  const cons = latest ? latest.consistency : null;

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('greet-eyebrow', `Good ${partOfDay}, ${firstName}`);
  document.getElementById('greet-title').innerHTML = history.length
    ? `Ready for<br><em>Week ${week}?</em>`
    : `Let's begin<br><em>Week 1</em>`;
  set('greet-sub', history.length
    ? 'Your consistency is compounding. Log this week to keep the momentum going.'
    : 'Your first check-in sets the baseline for the next 12 weeks.');

  const stats = document.getElementById('greet-stats');
  if (stats) {
    stats.style.display = 'flex';
    set('gs-week', `${week}/${totalWeeks}`);
    set('gs-cons', cons != null ? `${cons}%` : '—');
    set('gs-checkins', history.length);
  }

  // Quote matches current momentum (rotates with progress).
  const q = document.getElementById('welcome-quote');
  if (q) {
    q.textContent = cons == null ? 'Small daily choices compound into big life changes.'
      : cons >= 75 ? 'Momentum compounds. Keep showing up.'
      : cons >= 50 ? 'Consistency beats intensity. Stay the course.'
      : 'Small actions beat perfect intentions.';
  }
}

(async function init() {
  setAdminDrawerOpen(ADMIN_MODE || localStorage.getItem(ADMIN_DRAWER_KEY) === '1');
  setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');

  buildScale('scale-energy');
  buildScale('scale-mood');
  buildScale('scale-motivation');

  try {
    const user = await loadClientState();
    renderCustomItems();
    updateWelcomeChoice();

    if (user) {
      populateProfileFields(user);
      document.getElementById('sidebar-user').textContent = user.name;
      const returnBanner = document.getElementById('ret-banner');
      returnBanner.style.display = 'block';
      returnBanner.classList.add('show');
      document.getElementById('ret-name').textContent = user.name;
      const history = getHistory();
      const totalWeeks = user.weeks || 12;
      const week = Math.min(history.length + 1, totalWeeks);
      document.getElementById('ret-progress').textContent =
        `Week ${week} of ${totalWeeks} — ${history.length} check-in${history.length === 1 ? '' : 's'} logged so far.`;
      renderGreeting(user, history, week, totalWeeks);
    }

    if (ADMIN_MODE) await buildAdminDashboard();
  } catch (error) {
    console.error(error);
    resetClientState();
    renderCustomItems();
    updateWelcomeChoice();
    showError('Unable to load saved data from the server.');
  }

  document.getElementById('sim-slider').addEventListener('input', updateSim);
  buildOverview();
})();
