const ADMIN_DRAWER_KEY = 'wpt_admin_drawer_open';
function setAdminDrawerOpen(open) {
  const drawer = document.getElementById('admin-drawer');
  if (!drawer) return;
  drawer.classList.toggle('open', open);
  localStorage.setItem(ADMIN_DRAWER_KEY, open ? '1' : '0');
}
function toggleAdminDrawer() {
  const drawer = document.getElementById('admin-drawer');
  setAdminDrawerOpen(!drawer.classList.contains('open'));
}

const SIDEBAR_KEY = 'wpt_sidebar_collapsed';
function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
}
function toggleSidebar() {
  setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
}

function showError(message) {
  const banner = document.getElementById('sync-error-banner');
  if (!banner) return;
  banner.textContent = `⚠ ${message}`;
  banner.style.display = 'block';
  window.setTimeout(() => { banner.style.display = 'none'; }, 8000);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(str) {
  return esc(str).replace(/"/g, '&quot;');
}

function buildScale(id) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = `<div class="scale-row">${Array.from({length: 10}, (_, index) => `<button class="scale-btn" data-val="${index + 1}" onclick="selectScale('${id}',${index + 1})">${index + 1}</button>`).join('')}</div><div class="scale-labels"><span>Low</span><span>High</span></div>`;
}

function selectScale(id, value) {
  const container = document.getElementById(id);
  const color = value >= 7 ? '#16A34A' : value >= 4 ? '#F59E0B' : '#E50914';
  container.querySelectorAll('.scale-btn').forEach(button => {
    button.style.cssText = Number(button.dataset.val) <= value
      ? `background:${color};border-color:${color};color:#fff`
      : '';
  });
  container.dataset.selected = value;
}

function getScaleVal(id) {
  const container = document.getElementById(id);
  return container ? parseInt(container.dataset.selected, 10) || 0 : 0;
}

// Live update for the fancy habit sliders (fill width + value pill).
function updateHabitSlider(key, min, max) {
  const input = document.getElementById('h-' + key);
  if (!input) return;
  const val = +input.value;
  const vEl = document.getElementById('hsv-' + key);
  if (vEl) vEl.textContent = val + ' / ' + max;
  const fill = document.getElementById('hrf-' + key);
  if (fill) fill.style.width = ((val - min) / (max - min)) * 100 + '%';
}

const ynState = {};
function setYN(key, value) {
  ynState[key] = value;
  document.getElementById(`yn-${key}-yes`).classList.toggle('selected', value === 'yes');
  document.getElementById(`yn-${key}-no`).classList.toggle('selected', value === 'no');
}

let selectedBottlenecks = [];
let selectedOtherChips = [];

function toggleBottleneck(element) {
  const value = element.dataset.val;
  if (selectedBottlenecks.includes(value)) {
    selectedBottlenecks = selectedBottlenecks.filter(item => item !== value);
    element.classList.remove('selected');
  } else {
    selectedBottlenecks.push(value);
    element.classList.add('selected');
  }
  document.getElementById('other-bottleneck-card').style.display =
    selectedBottlenecks.includes('Other') ? 'block' : 'none';
}

// Bottleneck funnel: expand one detail panel at a time (accordion).
function toggleFunnel(index) {
  const el = document.getElementById('funnel-detail-' + index);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.funnel-detail').forEach(d => d.classList.remove('open'));
  if (!wasOpen) el.classList.add('open');
}

function toggleOtherChip(element) {
  const value = element.dataset.val;
  if (selectedOtherChips.includes(value)) {
    selectedOtherChips = selectedOtherChips.filter(item => item !== value);
    element.classList.remove('selected');
  } else {
    selectedOtherChips.push(value);
    element.classList.add('selected');
  }
}
