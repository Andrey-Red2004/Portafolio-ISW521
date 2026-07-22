'use strict';

(function () {

  const API_BASE = 'http://localhost:3000';
  const ENDPOINTS = {
    register: `${API_BASE}/auth/register`,
    login: `${API_BASE}/auth/authenticate`,
    groups: `${API_BASE}/get/groups`,
    teams: `${API_BASE}/get/teams`
  };

  const POLLING_INTERVAL_MS = 15000;
  const RATE_LIMIT_DEFAULT_WAIT_S = 30;
  const BACKOFF_BASE_MS = 2000;
  const BACKOFF_MAX_MS = 60000;
  const BACKOFF_MAX_ATTEMPTS = 6;

  const STORAGE_KEYS = {
    token: 'wc_dashboard_token',
    user: 'wc_dashboard_user',
    fontScale: 'wc_dashboard_fontscale',
    theme: 'wc_dashboard_theme',
    bold: 'wc_dashboard_bold'
  };


  const state = {
    token: null,
    user: null,

    teamsById: new Map(),
    zonesData: [],

    currentFilter: 'ALL',
    sortState: new Map(),

    pollingTimerId: null,
    pollingPaused: false,
    pollingSuspended: false,

    rateLimitTimerId: null,
    backoffTimerId: null,
    backoffAttempt: 0,

    reauthOpen: false
  };

  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    try {
      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } catch (_) {}
  }

  function loadSession() {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.token);
      const userRaw = localStorage.getItem(STORAGE_KEYS.user);
      if (token && userRaw) {
        state.token = token;
        state.user = JSON.parse(userRaw);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function clearSession() {
    state.token = null;
    state.user = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
    } catch (_) {}
  }

  class ApiError extends Error {
    constructor(message, status, retryAfterSeconds) {
      super(message);
      this.name = 'ApiError';
      this.status = status || null;
      this.retryAfterSeconds = retryAfterSeconds || null;
    }
  }

  async function apiRegister(name, email, password) {
    let response;
    try {
      const payload = { name, email, password };
      console.log('[apiRegister] Enviando:', payload, 'a', ENDPOINTS.register);
      response = await fetch(ENDPOINTS.register, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkError) {
      console.error('[apiRegister] Error de red:', networkError);
      throw new ApiError('No se pudo contactar al servidor.', null);
    }

    let body = null;
    try { body = await response.json(); } catch (parseErr) {
      console.error('[apiRegister] Error al parsear JSON:', parseErr);
    }

    console.log('[apiRegister] Respuesta HTTP', response.status, ':', body);
    if (!response.ok) {
      console.error('[apiRegister] Error:', body);
      throw new ApiError((body && body.message) || 'No se pudo crear la cuenta.', response.status);
    }
    return body;
  }

  async function apiLogin(email, password) {
    let response;
    try {
      response = await fetch(ENDPOINTS.login, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (networkError) {
      throw new ApiError('No se pudo contactar al servidor.', null);
    }

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (!response.ok) {
      throw new ApiError((body && body.message) || 'Credenciales inválidas.', response.status);
    }
    return body;
  }

  async function apiGet(url, token) {
    let response;
    try {
      response = await fetch(url, {
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (networkError) {
      throw new ApiError('Falla de red al contactar la API.', null);
    }

    if (response.status === 401) {
      throw new ApiError('Token inválido o expirado.', 401);
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After'), 10);
      throw new ApiError('Límite de peticiones alcanzado.', 429,
        Number.isFinite(retryAfter) ? retryAfter : null);
    }
    if (!response.ok) {
      throw new ApiError(`El servidor respondió con estado ${response.status}.`, response.status);
    }

    try {
      return await response.json();
    } catch (_) {
      throw new ApiError('La respuesta del servidor no es un JSON válido.', response.status);
    }
  }

  async function apiFetchGroups(token) {
    return apiGet(ENDPOINTS.groups, token);
  }

  async function apiFetchTeams(token) {
    return apiGet(ENDPOINTS.teams, token);
  }

  async function handleApiError(error) {
    if (!(error instanceof ApiError)) {
      showErrorPanel('Error inesperado', error.message || 'Ocurrió un problema.', '');
      console.error('[app] Error no clasificado:', error);
      return;
    }

    if (error.status === 401) {
      handleUnauthorized();
      return;
    }
    if (error.status === 429) {
      handleRateLimited(error.retryAfterSeconds);
      return;
    }
    handleServerOrNetworkError(error);
  }

  function handleUnauthorized() {
    suspendPolling();
    if (state.reauthOpen) return;

    clearSession();
    state.reauthOpen = true;

    setConnectionIndicator('offline', 'Sesión expirada');
    showErrorPanel(
      'Sesión expirada',
      'Tu token JWT ya no es válido. Tus filtros y el orden de las tablas se mantienen intactos.',
      'Vuelve a iniciar sesión desde el cuadro que apareció para continuar.',
      { showReauth: true }
    );

    const dialog = document.getElementById('reauth-dialog');
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
    document.getElementById('reauth-email').focus();
  }

  function handleRateLimited(retryAfterSeconds) {
    suspendPolling();
    clearTimeout(state.backoffTimerId);

    let remaining = retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds
      : RATE_LIMIT_DEFAULT_WAIT_S;

    const panel = document.getElementById('rate-limit-panel');
    const countdownEl = document.getElementById('rate-limit-countdown');
    panel.hidden = false;
    countdownEl.textContent = String(remaining);
    setPollingStatus(`Límite de peticiones alcanzado. Reintentando en ${remaining}s…`);

    clearInterval(state.rateLimitTimerId);
    state.rateLimitTimerId = setInterval(() => {
      remaining -= 1;
      countdownEl.textContent = String(Math.max(remaining, 0));
      setPollingStatus(`Límite de peticiones alcanzado. Reintentando en ${Math.max(remaining, 0)}s…`);

      if (remaining <= 0) {
        clearInterval(state.rateLimitTimerId);
        panel.hidden = true;
        resumePolling();
        refreshStandings();
      }
    }, 1000);
  }

  function handleServerOrNetworkError(error) {
    suspendPolling();
    clearInterval(state.rateLimitTimerId);

    state.backoffAttempt = Math.min(state.backoffAttempt + 1, BACKOFF_MAX_ATTEMPTS);
    const delayMs = Math.min(BACKOFF_BASE_MS * Math.pow(2, state.backoffAttempt - 1), BACKOFF_MAX_MS);
    const delaySeconds = Math.round(delayMs / 1000);

    const panel = document.getElementById('backoff-panel');
    panel.hidden = false;
    document.getElementById('backoff-attempt').textContent = String(state.backoffAttempt);
    document.getElementById('backoff-delay').textContent = String(delaySeconds);

    showErrorPanel(
      'La API está inestable o no responde',
      error.status
        ? `El servidor respondió con el código ${error.status}.`
        : 'No se pudo establecer conexión con el servidor (red o timeout).',
      `Reintentando automáticamente en ${delaySeconds}s (intento ${state.backoffAttempt}).`,
      { showRetryNow: true }
    );
    setConnectionIndicator('offline', 'Sin conexión con la API');

    clearTimeout(state.backoffTimerId);
    state.backoffTimerId = setTimeout(() => {
      refreshStandings();
    }, delayMs);
  }

  function resetBackoff() {
    state.backoffAttempt = 0;
    clearTimeout(state.backoffTimerId);
    document.getElementById('backoff-panel').hidden = true;
  }

  function clearAllErrorUi() {
    document.getElementById('error-panel').hidden = true;
    document.getElementById('error-retry-button').hidden = true;
    document.getElementById('error-reauth-button').hidden = true;
  }

  function showErrorPanel(title, message, detail, opts) {
    opts = opts || {};
    const panel = document.getElementById('error-panel');
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-detail').textContent = detail || '';
    panel.hidden = false;

    const retryBtn = document.getElementById('error-retry-button');
    const reauthBtn = document.getElementById('error-reauth-button');
    retryBtn.hidden = !opts.showRetryNow;
    reauthBtn.hidden = !opts.showReauth;
  }

  function startPolling() {
    stopPolling();
    state.pollingTimerId = setInterval(refreshStandings, POLLING_INTERVAL_MS);
    state.pollingPaused = false;
    setPollingStatus('Actualización automática activa (cada 15s).');
  }

  function stopPolling() {
    clearInterval(state.pollingTimerId);
    state.pollingTimerId = null;
  }

  function suspendPolling() {
    state.pollingSuspended = true;
    stopPolling();
  }

  function resumePolling() {
    state.pollingSuspended = false;
    if (!state.pollingPaused && state.token) {
      startPolling();
    }
  }

  function handleVisibilityChange() {
    if (!state.token) return;

    if (document.hidden) {
      state.pollingPaused = true;
      stopPolling();
      setPollingStatus('Actualización en pausa (pestaña no visible).');
    } else {
      state.pollingPaused = false;
      if (!state.pollingSuspended) {
        startPolling();
        refreshStandings();
      }
    }
  }

  async function refreshStandings() {
    if (!state.token) return;

    try {
      const groupsResponse = await apiFetchGroups(state.token);
      console.log('[refreshStandings] Respuesta de grupos:', groupsResponse);
      const zones = Array.isArray(groupsResponse) ? groupsResponse : (groupsResponse.groups || []);
      console.log('[refreshStandings] Zonas procesadas:', zones);

      state.zonesData = zones;
      resetBackoff();
      clearAllErrorUi();
      document.getElementById('backoff-panel').hidden = true;
      setConnectionIndicator('online', 'Conectado');

      ensureFilterButtons(zones);
      renderZones(zones);
      updateLastUpdatedTime();
    } catch (error) {
      await handleApiError(error);
    }
  }

  async function loadTeamsOnce() {
    try {
      const teamsResponse = await apiFetchTeams(state.token);
      const teams = Array.isArray(teamsResponse) ? teamsResponse : (teamsResponse.teams || []);
      state.teamsById.clear();
      teams.forEach((team) => {
        state.teamsById.set(String(team.id), {
          name: team.name_en || team.name_fa || `Equipo ${team.id}`,
          fifaCode: team.fifa_code || '',
          flag: team.flag || ''
        });
      });
    } catch (error) {
      console.warn('[app] No se pudieron cargar los equipos, se usará team_id como nombre.', error);
    }
  }

  function teamLabel(teamId) {
    const team = state.teamsById.get(String(teamId));
    if (!team) return `Equipo ${teamId}`;
    return team.fifaCode ? `${team.name} (${team.fifaCode})` : team.name;
  }

  function computeStandingsOrder(teams) {
    return [...teams].sort((a, b) => {
      const ptsA = Number(a.pts) || 0, ptsB = Number(b.pts) || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const gdA = (Number(a.gf) || 0) - (Number(a.ga) || 0);
      const gdB = (Number(b.gf) || 0) - (Number(b.ga) || 0);
      if (gdB !== gdA) return gdB - gdA;
      return (Number(b.gf) || 0) - (Number(a.gf) || 0);
    });
  }

  function applySort(teamsWithRank, zoneLetter) {
    const sort = state.sortState.get(zoneLetter);
    if (!sort) return teamsWithRank;

    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...teamsWithRank].sort((a, b) => {
      let valA, valB;
      switch (sort.key) {
        case 'team': valA = teamLabel(a.team_id).toLowerCase(); valB = teamLabel(b.team_id).toLowerCase(); break;
        case 'gf': valA = Number(a.gf) || 0; valB = Number(b.gf) || 0; break;
        case 'ga': valA = Number(a.ga) || 0; valB = Number(b.ga) || 0; break;
        case 'gd': valA = a._gd; valB = b._gd; break;
        case 'pts': valA = Number(a.pts) || 0; valB = Number(b.pts) || 0; break;
        default: valA = a._rank; valB = b._rank;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  function renderZones(zones) {
    const container = document.getElementById('zones-container');
    const zoneTemplate = document.getElementById('zone-block-template');
    const rowTemplate = document.getElementById('row-template');

    const seenZones = new Set();
    let totalTeams = 0;

    zones.forEach((zoneData) => {
      const zoneLetter = zoneData.group || zoneData.letter || zoneData.name || zoneData.id;
      console.log('[renderZones] Procesando zona:', zoneLetter, zoneData);
      seenZones.add(zoneLetter);

      const standingsOrder = computeStandingsOrder(zoneData.teams || []);
      const leaderId = standingsOrder.length ? standingsOrder[0].team_id : null;

      const withRank = standingsOrder.map((t, idx) => ({
        ...t,
        _rank: idx + 1,
        _gd: (Number(t.gf) || 0) - (Number(t.ga) || 0)
      }));

      const displayRows = applySort(withRank, zoneLetter);

      let zoneEl = container.querySelector(`.zone-block[data-zone="${zoneLetter}"]`);
      if (!zoneEl) {
        const fragment = zoneTemplate.content.cloneNode(true);
        zoneEl = fragment.querySelector('.zone-block');
        zoneEl.dataset.zone = zoneLetter;
        zoneEl.querySelector('.zone-block__title').textContent = `Zona ${zoneLetter}`;
        zoneEl.querySelector('caption').textContent = `Tabla de posiciones — Zona ${zoneLetter}`;
        container.appendChild(fragment);
        zoneEl = container.querySelector(`.zone-block[data-zone="${zoneLetter}"]`);
      }

      const sort = state.sortState.get(zoneLetter);
      zoneEl.querySelectorAll('th[data-sort-key]').forEach((th) => {
        const key = th.dataset.sortKey;
        if (sort && sort.key === key) {
          th.setAttribute('aria-sort', sort.direction === 'asc' ? 'ascending' : 'descending');
        } else {
          th.setAttribute('aria-sort', 'none');
        }
      });

      const badge = zoneEl.querySelector('.zone-leader-badge');
      badge.textContent = leaderId ? `🏆 Líder: ${teamLabel(leaderId)}` : '';

      const tbody = zoneEl.querySelector('tbody');
      tbody.innerHTML = '';
      displayRows.forEach((row) => {
        const rowFragment = rowTemplate.content.cloneNode(true);
        const tr = rowFragment.querySelector('tr');
        tr.dataset.teamId = row.team_id;
        if (String(row.team_id) === String(leaderId)) {
          tr.classList.add('is-leader');
        }
        tr.querySelector('[data-field="rank"]').textContent = row._rank;
        tr.querySelector('[data-field="team"]').textContent = teamLabel(row.team_id);
        tr.querySelector('[data-field="gf"]').textContent = row.gf;
        tr.querySelector('[data-field="ga"]').textContent = row.ga;
        tr.querySelector('[data-field="gd"]').textContent = (row._gd > 0 ? '+' : '') + row._gd;
        tr.querySelector('[data-field="pts"]').textContent = row.pts;
        tbody.appendChild(rowFragment);
      });

      totalTeams += displayRows.length;

      zoneEl.hidden = !(state.currentFilter === 'ALL' || state.currentFilter === zoneLetter);
    });

    container.querySelectorAll('.zone-block').forEach((el) => {
      if (!seenZones.has(el.dataset.zone)) el.remove();
    });

    document.getElementById('standings-summary').textContent =
      `${seenZones.size} zonas · ${totalTeams} equipos mostrados · filtro: ${state.currentFilter === 'ALL' ? 'Todas' : 'Zona ' + state.currentFilter}`;
  }

  function ensureFilterButtons(zones) {
    const wrapper = document.getElementById('zone-filter-buttons');
    if (wrapper.dataset.built === 'true') return;

    const template = document.getElementById('zone-filter-button-template');
    wrapper.innerHTML = '';

    const allBtnFragment = template.content.cloneNode(true);
    const allBtn = allBtnFragment.querySelector('.zone-filter-btn');
    allBtn.textContent = 'Todas';
    allBtn.dataset.zone = 'ALL';
    allBtn.setAttribute('aria-pressed', 'true');
    allBtn.classList.add('is-active');
    wrapper.appendChild(allBtnFragment);

    const zoneLetters = zones
      .map((z) => z.group || z.letter || z.name || z.id)
      .filter(Boolean)
      .sort();
    
    console.log('[ensureFilterButtons] Zonas encontradas:', zoneLetters);

    zoneLetters.forEach((letter) => {
      const fragment = template.content.cloneNode(true);
      const btn = fragment.querySelector('.zone-filter-btn');
      btn.textContent = `Zona ${letter}`;
      btn.dataset.zone = letter;
      btn.setAttribute('aria-pressed', 'false');
      wrapper.appendChild(fragment);
    });

    wrapper.dataset.built = 'true';
  }

  function applyFilter(zoneLetter) {
    state.currentFilter = zoneLetter;
    document.querySelectorAll('.zone-filter-btn').forEach((btn) => {
      const isActive = btn.dataset.zone === zoneLetter;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    document.querySelectorAll('.zone-block').forEach((zoneEl) => {
      zoneEl.hidden = !(zoneLetter === 'ALL' || zoneEl.dataset.zone === zoneLetter);
    });
  }

  function updateLastUpdatedTime() {
    const el = document.getElementById('last-updated-time');
    const now = new Date();
    el.textContent = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.setAttribute('datetime', now.toISOString());
  }

  function setConnectionIndicator(stateName, text) {
    const el = document.getElementById('connection-indicator');
    el.dataset.state = stateName;
    el.textContent = text;
  }

  function setPollingStatus(text) {
    document.getElementById('polling-status').textContent = text;
  }

  function initSortDelegation() {
    const container = document.getElementById('zones-container');
    container.addEventListener('click', (event) => {
      const button = event.target.closest('.sort-button');
      if (!button) return;

      const th = button.closest('th[data-sort-key]');
      const zoneEl = button.closest('.zone-block');
      if (!th || !zoneEl) return;

      const zoneLetter = zoneEl.dataset.zone;
      const key = th.dataset.sortKey;
      const current = state.sortState.get(zoneLetter);

      let nextDirection = 'desc';
      if (current && current.key === key) {
        nextDirection = current.direction === 'desc' ? 'asc' : 'desc';
      }
      state.sortState.set(zoneLetter, { key, direction: nextDirection });

      renderZones(state.zonesData);
    });
  }

  function showAuthenticatedUi() {
    document.getElementById('auth-section').dataset.authenticated = 'true';
    document.getElementById('filters-section').hidden = false;
    document.getElementById('standings-section').hidden = false;
    document.getElementById('refresh-button').disabled = false;

    document.getElementById('login-form').hidden = true;
    document.getElementById('register-form').hidden = true;
    document.querySelector('.auth-tabs').hidden = true;

    const userPanel = document.getElementById('user-panel');
    userPanel.hidden = false;
    document.getElementById('user-greeting').textContent =
      state.user && state.user.name ? `Hola, ${state.user.name}` : 'Sesión activa';
  }

  function showUnauthenticatedUi() {
    document.getElementById('auth-section').dataset.authenticated = 'false';
    document.getElementById('filters-section').hidden = true;
    document.getElementById('standings-section').hidden = true;

    document.querySelector('.auth-tabs').hidden = false;
    document.getElementById('user-panel').hidden = true;

    document.getElementById('zones-container').innerHTML = '';
    document.getElementById('zone-filter-buttons').innerHTML = '';
    document.getElementById('zone-filter-buttons').dataset.built = 'false';
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const statusEl = document.getElementById('auth-status');
    const button = document.getElementById('login-button');

    statusEl.dataset.state = 'loading';
    statusEl.textContent = 'Iniciando sesión…';
    button.disabled = true;

    try {
      const result = await apiLogin(email, password);
      saveSession(result.token, result.user);
      statusEl.dataset.state = 'success';
      statusEl.textContent = '';
      showToast('success', `Bienvenido, ${result.user.name || 'usuario'}.`);
      await afterAuthSuccess();
    } catch (error) {
      statusEl.dataset.state = 'error';
      statusEl.textContent = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
    } finally {
      button.disabled = false;
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const statusEl = document.getElementById('auth-status');
    const button = document.getElementById('register-button');

    statusEl.dataset.state = 'loading';
    statusEl.textContent = 'Creando cuenta…';
    button.disabled = true;

    try {
      const result = await apiRegister(name, email, password);
      saveSession(result.token, result.user);
      statusEl.dataset.state = 'success';
      statusEl.textContent = '';
      showToast('success', `Cuenta creada. ¡Bienvenido, ${result.user.name || name}!`);
      await afterAuthSuccess();
    } catch (error) {
      statusEl.dataset.state = 'error';
      statusEl.textContent = error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.';
    } finally {
      button.disabled = false;
    }
  }

  async function handleReauthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('reauth-email').value.trim();
    const password = document.getElementById('reauth-password').value;
    const statusEl = document.getElementById('reauth-status');
    const button = document.getElementById('reauth-submit-button');

    statusEl.textContent = 'Reautenticando…';
    button.disabled = true;

    try {
      const result = await apiLogin(email, password);
      saveSession(result.token, result.user);

      const dialog = document.getElementById('reauth-dialog');
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');

      state.reauthOpen = false;
      statusEl.textContent = '';
      document.getElementById('reauth-form').reset();

      clearAllErrorUi();
      setConnectionIndicator('online', 'Conectado');
      showToast('success', 'Sesión restaurada. Tus filtros y orden se mantuvieron.');

      resumePolling();
      await refreshStandings();
    } catch (error) {
      statusEl.textContent = error instanceof ApiError ? error.message : 'No se pudo reautenticar.';
    } finally {
      button.disabled = false;
    }
  }

  function handleLogout() {
    clearSession();
    stopPolling();
    clearInterval(state.rateLimitTimerId);
    clearTimeout(state.backoffTimerId);
    resetBackoff();
    clearAllErrorUi();
    document.getElementById('rate-limit-panel').hidden = true;

    state.zonesData = [];
    state.sortState.clear();
    state.currentFilter = 'ALL';
    state.teamsById.clear();

    showUnauthenticatedUi();
    setConnectionIndicator('idle', 'Sesión cerrada');
    showToast('info', 'Sesión cerrada correctamente.');
  }

  async function afterAuthSuccess() {
    showAuthenticatedUi();
    await loadTeamsOnce();
    resetBackoff();
    await refreshStandings();
    startPolling();
  }

  async function tryRestoreSession() {
    if (!loadSession()) return;
    showAuthenticatedUi();
    await loadTeamsOnce();
    await refreshStandings();
    startPolling();
  }

    const FONT_STEPS = [100, 112, 125, 137, 150];

  function applyFontScale(stepIndex) {
    const clamped = Math.max(0, Math.min(FONT_STEPS.length - 1, stepIndex));
    document.documentElement.style.fontSize = FONT_STEPS[clamped] + '%';
    document.documentElement.dataset.fontStep = String(clamped);
    try { localStorage.setItem(STORAGE_KEYS.fontScale, String(clamped)); } catch (_) {}
  }

  function initA11yToolbar() {
    let fontStep = 0;
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEYS.fontScale), 10);
      if (Number.isFinite(saved)) fontStep = saved;
    } catch (_) {}
    applyFontScale(fontStep);

    document.getElementById('font-increase-btn').addEventListener('click', () => {
      fontStep = Math.min(fontStep + 1, FONT_STEPS.length - 1);
      applyFontScale(fontStep);
    });
    document.getElementById('font-decrease-btn').addEventListener('click', () => {
      fontStep = Math.max(fontStep - 1, 0);
      applyFontScale(fontStep);
    });
    document.getElementById('font-reset-btn').addEventListener('click', () => {
      fontStep = 0;
      applyFontScale(fontStep);
    });

    const themeBtn = document.getElementById('theme-toggle-btn');
    let theme = 'light';
    try { theme = localStorage.getItem(STORAGE_KEYS.theme) || 'light'; } catch (_) {}
    applyTheme(theme);

    themeBtn.addEventListener('click', () => {
      theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch (_) {}
    });

    const boldBtn = document.getElementById('bold-toggle-btn');
    let bold = false;
    try { bold = localStorage.getItem(STORAGE_KEYS.bold) === 'true'; } catch (_) {}
    applyBold(bold);

    boldBtn.addEventListener('click', () => {
      bold = document.documentElement.dataset.bold !== 'true';
      applyBold(bold);
      try { localStorage.setItem(STORAGE_KEYS.bold, String(bold)); } catch (_) {}
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('theme-toggle-btn');
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.querySelector('.a11y-btn__icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.querySelector('.a11y-btn__text').textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }

  function applyBold(isBold) {
    document.documentElement.dataset.bold = String(isBold);
    const btn = document.getElementById('bold-toggle-btn');
    btn.setAttribute('aria-pressed', String(isBold));
  }

  function showToast(kind, message) {
    const container = document.getElementById('notifications-section');
    const toast = document.createElement('article');
    toast.className = `toast toast--${kind}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--leaving');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function initConnectivityWatch() {
    window.addEventListener('offline', () => {
      setConnectionIndicator('offline', 'Sin conexión a internet');
    });
    window.addEventListener('online', () => {
      setConnectionIndicator('checking', 'Reconectando…');
      if (state.token) refreshStandings();
    });
  }

  function initEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
    document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
    document.getElementById('reauth-form').addEventListener('submit', handleReauthSubmit);
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    document.getElementById('refresh-button').addEventListener('click', refreshStandings);

    document.getElementById('error-retry-button').addEventListener('click', () => {
      clearAllErrorUi();
      document.getElementById('backoff-panel').hidden = true;
      resetBackoff();
      resumePolling();
      refreshStandings();
    });
    document.getElementById('error-reauth-button').addEventListener('click', handleUnauthorized);

    document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tab-register').addEventListener('click', () => switchAuthTab('register'));

    document.getElementById('zone-filter-buttons').addEventListener('click', (event) => {
      const btn = event.target.closest('.zone-filter-btn');
      if (!btn) return;
      applyFilter(btn.dataset.zone);
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    initSortDelegation();
  }

  function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const isLogin = tab === 'login';
    loginTab.setAttribute('aria-selected', String(isLogin));
    registerTab.setAttribute('aria-selected', String(!isLogin));
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    document.getElementById('auth-status').textContent = '';
  }

  async function init() {
    initA11yToolbar();
    initEventListeners();
    initConnectivityWatch();
    setConnectionIndicator('idle', 'Sin autenticar');
    await tryRestoreSession();
  }

  document.addEventListener('DOMContentLoaded', init);

})();