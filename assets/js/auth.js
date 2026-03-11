// assets/js/auth.js — User authentication (login / register) for KylianShop

document.addEventListener('DOMContentLoaded', () => {
  injectAuthModal();
  refreshNavAuth();
});

// ─── Helpers ─────────────────────────────────────────────────

function getUser() {
  try { return JSON.parse(localStorage.getItem('kylian_user')); } catch { return null; }
}

function normalizeUser(u) {
  if (!u) return u;
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name || u.firstName || '',
    lastName: u.last_name || u.lastName || '',
    role: u.role,
  };
}

function setSession(token, user) {
  localStorage.setItem('kylian_token', token);
  localStorage.setItem('kylian_user', JSON.stringify(normalizeUser(user)));
}

function clearSession() {
  localStorage.removeItem('kylian_token');
  localStorage.removeItem('kylian_user');
}

function refreshNavAuth() {
  const user = getUser();

  const selectors = [
    '#auth-nav-login', '#auth-nav-logout',
    '#auth-nav-user', '#auth-nav-username',
    '#nav-messages', '#nav-admin',
    '#footer-auth-login', '#footer-auth-logout'
  ];

  // header elements
  const loginBtn  = document.getElementById('auth-nav-login');
  const logoutBtn = document.getElementById('auth-nav-logout');
  const userEl    = document.getElementById('auth-nav-user');
  const userNameEl = document.getElementById('auth-nav-username');
  const msgLink   = document.getElementById('nav-messages');
  const adminLink = document.getElementById('nav-admin');

  // footer elements
  const footerLogin  = document.getElementById('footer-auth-login');
  const footerLogout = document.getElementById('footer-auth-logout');

  function toggleBtn(btn, visible) {
    if (!btn) return;
    if (visible) {
      btn.classList.remove('d-none');
      btn.classList.add('d-inline-flex');
    } else {
      btn.classList.add('d-none');
      btn.classList.remove('d-inline-flex');
    }
  }

  toggleBtn(loginBtn, !user);
  toggleBtn(logoutBtn, !!user);
  toggleBtn(footerLogin, !user);
  toggleBtn(footerLogout, !!user);

  if (userEl)     userEl.style.display    = user ? 'inline-flex' : 'none';
  if (userNameEl) userNameEl.textContent  = user ? (user.firstName || user.email) : '';
  if (msgLink)    msgLink.style.display   = user ? 'block' : 'none';
  if (adminLink)  adminLink.style.display = user && user.role === 'admin' ? 'block' : 'none';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('auth-toast');
  const body  = document.getElementById('auth-toast-body');
  if (!toast || !body) return;

  body.textContent = message;
  toast.className  = `toast align-items-center text-bg-${type} border-0`;
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();
}

// ─── Auth Modal ──────────────────────────────────────────────

function injectAuthModal() {
  // Only inject once
  if (document.getElementById('authModal')) return;

  const html = `
  <!-- Auth Modal -->
  <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-0 border-0 shadow-lg">
        <div class="modal-header border-0 pb-0">
          <ul class="nav nav-tabs border-0 gap-3" id="authTabs">
            <li class="nav-item">
              <button class="nav-link active px-0 fw-bold text-dark border-0 border-bottom border-2 border-dark rounded-0 text-uppercase tracking-widest fs-7"
                      id="tab-login" onclick="switchAuthTab('login')">Sign In</button>
            </li>
            <li class="nav-item">
              <button class="nav-link px-0 text-muted border-0 rounded-0 text-uppercase tracking-widest fs-7"
                      id="tab-register" onclick="switchAuthTab('register')">Create Account</button>
            </li>
          </ul>
          <button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body pt-3 pb-4 px-4">
          <p id="auth-error" class="text-danger small mb-3" style="display:none;"></p>

          <!-- LOGIN FORM -->
          <form id="login-form" onsubmit="handleLogin(event)">
            <div class="mb-3">
              <label class="form-label text-muted fs-7 text-uppercase tracking-widest">Email</label>
              <input type="email" id="login-email" class="form-control rounded-0 shadow-none border-secondary py-2" required>
            </div>
            <div class="mb-4">
              <label class="form-label text-muted fs-7 text-uppercase tracking-widest">Password</label>
              <input type="password" id="login-password" class="form-control rounded-0 shadow-none border-secondary py-2" required>
            </div>
            <button type="submit" class="btn btn-dark w-100 py-2 text-uppercase tracking-widest fw-bold rounded-0" id="login-btn">
              Sign In
            </button>
          </form>

          <!-- REGISTER FORM -->
          <form id="register-form" style="display:none;" onsubmit="handleRegister(event)">
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label text-muted fs-7 text-uppercase tracking-widest">First Name</label>
                <input type="text" id="reg-firstname" class="form-control rounded-0 shadow-none border-secondary py-2">
              </div>
              <div class="col-6">
                <label class="form-label text-muted fs-7 text-uppercase tracking-widest">Last Name</label>
                <input type="text" id="reg-lastname" class="form-control rounded-0 shadow-none border-secondary py-2">
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label text-muted fs-7 text-uppercase tracking-widest">Email</label>
              <input type="email" id="reg-email" class="form-control rounded-0 shadow-none border-secondary py-2" required>
            </div>
            <div class="mb-4">
              <label class="form-label text-muted fs-7 text-uppercase tracking-widest">Password <small class="text-muted">(min. 6 chars)</small></label>
              <input type="password" id="reg-password" class="form-control rounded-0 shadow-none border-secondary py-2" required minlength="6">
            </div>
            <button type="submit" class="btn btn-dark w-100 py-2 text-uppercase tracking-widest fw-bold rounded-0" id="register-btn">
              Create Account
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:9999;">
    <div id="auth-toast" class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive">
      <div class="d-flex">
        <div class="toast-body" id="auth-toast-body">Done!</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function switchAuthTab(tab) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');
  const errEl        = document.getElementById('auth-error');

  errEl.style.display = 'none';

  if (tab === 'login') {
    loginForm.style.display    = '';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active', 'text-dark', 'border-dark', 'border-bottom', 'border-2');
    tabLogin.classList.remove('text-muted');
    tabRegister.classList.remove('active', 'text-dark', 'border-dark', 'border-bottom', 'border-2');
    tabRegister.classList.add('text-muted');
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = '';
    tabRegister.classList.add('active', 'text-dark', 'border-dark', 'border-bottom', 'border-2');
    tabRegister.classList.remove('text-muted');
    tabLogin.classList.remove('active', 'text-dark', 'border-dark', 'border-bottom', 'border-2');
    tabLogin.classList.add('text-muted');
  }
}

// ─── Auth Handlers ───────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const data = await api.post('/users/login', { email, password });
    setSession(data.token, data.user);
    bootstrap.Modal.getInstance(document.getElementById('authModal'))?.hide();
    refreshNavAuth();
    const name = (data.user.firstName || data.user.first_name || data.user.email);
    showToast(`Welcome back, ${name}!`);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn   = document.getElementById('register-btn');
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  const firstName = document.getElementById('reg-firstname').value;
  const lastName  = document.getElementById('reg-lastname').value;
  const email     = document.getElementById('reg-email').value;
  const password  = document.getElementById('reg-password').value;

  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    const data = await api.post('/users/register', { email, password, firstName, lastName });
    setSession(data.token, data.user);
    bootstrap.Modal.getInstance(document.getElementById('authModal'))?.hide();
    refreshNavAuth();
    const name = (data.user.first_name || data.user.firstName || email);
    showToast(`Account created! Welcome, ${name}!`);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create Account';
  }
}

function logout() {
  clearSession();
  refreshNavAuth();
  showToast('You have been signed out.', 'secondary');
}

// Global access
window.switchAuthTab = switchAuthTab;
window.handleLogin   = handleLogin;
window.handleRegister = handleRegister;
window.logout        = logout;
