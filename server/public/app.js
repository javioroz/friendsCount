// ------------------------------------------------------------------
// GunDB relay UI
// ------------------------------------------------------------------
// Two views:
//   1) List view  -> fetches /api/groups and renders one card per group
//                    showing id, meta.name, meta.icon, member count.
//                    Clicking a card navigates to the details view.
//   2) Details    -> fetches /api/groups/:id and renders the full JSON
//                    document (meta + members + expenses + favors +
//                    balances + rankings).
//
// We use the URL hash for client-side routing so the static index.html
// can be served for both views (see the catch-all route in index.ts).
// ------------------------------------------------------------------

const ROUTES = {
  list: '#/',
  detailsPrefix: '#/group/',
};

const els = {
  viewList: document.getElementById('view-list'),
  viewDetails: document.getElementById('view-details'),
  status: document.getElementById('status'),
  list: document.getElementById('groups'),
  detailsTitle: document.getElementById('details-title'),
  detailsStatus: document.getElementById('details-status'),
  detailsJson: document.getElementById('details-json'),
  backBtn: document.getElementById('back-btn'),
};

let listRefreshTimer = null;

// ------------------------------------------------------------------
// Routing
// ------------------------------------------------------------------
function currentRoute() {
  return window.location.hash || ROUTES.list;
}

function showList() {
  els.viewList.hidden = false;
  els.viewDetails.hidden = true;
  fetchGroups();
}

function showDetails(groupId) {
  els.viewList.hidden = true;
  els.viewDetails.hidden = false;
  fetchGroupDetails(groupId);
}

function handleRouteChange() {
  const route = currentRoute();
  if (route === ROUTES.list || route === '' || route === '#') {
    showList();
    return;
  }
  if (route.startsWith(ROUTES.detailsPrefix)) {
    const groupId = decodeURIComponent(route.slice(ROUTES.detailsPrefix.length));
    if (groupId) {
      showDetails(groupId);
      return;
    }
  }
  // Unknown route: fall back to list
  window.location.hash = ROUTES.list;
}

window.addEventListener('hashchange', handleRouteChange);

// ------------------------------------------------------------------
// List view
// ------------------------------------------------------------------
async function fetchGroups() {
  if (!els.status || !els.list) return;
  try {
    els.status.textContent = 'Conectando al servidor...';
    const res = await fetch('/api/groups');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const groups = Array.isArray(data.groups) ? data.groups : [];
    renderGroups(groups);
    els.status.textContent = `Conectado — ${groups.length} grupos`;
  } catch (err) {
    els.status.textContent = 'Error: ' + (err.message || err);
    els.list.innerHTML = '';
  }
}

function renderGroups(groups) {
  els.list.innerHTML = '';
  if (groups.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No hay grupos';
    els.list.appendChild(li);
    return;
  }
  for (const g of groups) {
    els.list.appendChild(buildGroupCard(g));
  }
}

function buildGroupCard(g) {
  const li = document.createElement('li');
  li.className = 'card';
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', `Ver detalles del grupo ${g.id}`);

  const title = document.createElement('div');
  title.className = 'card-title';

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = g.icon || '📁';
  title.appendChild(icon);

  const name = document.createElement('span');
  name.textContent = g.name || `Grupo ${g.id}`;
  title.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const memberCount = typeof g.memberCount === 'number' ? g.memberCount : 0;
  meta.textContent = `ID: ${g.id} — Miembros: ${memberCount}`;

  li.appendChild(title);
  li.appendChild(meta);

  const navigate = () => {
    window.location.hash = ROUTES.detailsPrefix + encodeURIComponent(g.id);
  };
  li.addEventListener('click', navigate);
  li.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      navigate();
    }
  });

  return li;
}

// ------------------------------------------------------------------
// Details view
// ------------------------------------------------------------------
async function fetchGroupDetails(groupId) {
  if (!els.detailsJson) return;
  els.detailsStatus.textContent = 'Cargando...';
  els.detailsTitle.textContent = `Grupo ${groupId}`;
  els.detailsJson.textContent = '';

  try {
    const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`);
    if (res.status === 404) {
      els.detailsStatus.textContent = 'Grupo no encontrado';
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const meta = data.meta || {};
    const titleName = meta.name || `Grupo ${data.id}`;
    const titleIcon = meta.icon ? `${meta.icon} ` : '';
    els.detailsTitle.textContent = `${titleIcon}${titleName}`;
    els.detailsStatus.textContent = `ID: ${data.id}`;
    els.detailsJson.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    els.detailsStatus.textContent = 'Error: ' + (err.message || err);
    els.detailsJson.textContent = '';
  }
}

// ------------------------------------------------------------------
// Wire up controls
// ------------------------------------------------------------------
if (els.backBtn) {
  els.backBtn.addEventListener('click', () => {
    window.location.hash = ROUTES.list;
  });
}

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------
window.addEventListener('load', () => {
  // Default to list if no hash present
  if (!window.location.hash) {
    window.location.hash = ROUTES.list;
  } else {
    handleRouteChange();
  }
  // Periodic refresh of the list view (only while list is visible).
  listRefreshTimer = setInterval(() => {
    if (!els.viewList.hidden) fetchGroups();
  }, 8000);
});
