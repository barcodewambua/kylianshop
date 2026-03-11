// assets/js/footer.js
// Injects authentication controls into the footer and keeps them in sync.

function renderFooterAuth() {
    const html = `
<div class="d-flex justify-content-center gap-3 py-3">
  <button class="btn btn-outline-dark btn-sm rounded-0 text-uppercase tracking-widest px-3 d-none d-lg-inline-flex"
          id="footer-auth-login" data-bs-toggle="modal" data-bs-target="#authModal">
    Sign In
  </button>
  <button class="btn btn-outline-danger btn-sm rounded-0 text-uppercase tracking-widest px-3 d-none d-lg-inline-flex"
          id="footer-auth-logout" onclick="logout()" style="display:none;">
    Sign Out
  </button>
</div>
`;
    const container = document.getElementById('footer-auth-placeholder');
    if (container) container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    renderFooterAuth();
    if (typeof refreshNavAuth === 'function') {
        refreshNavAuth();
    }
});
