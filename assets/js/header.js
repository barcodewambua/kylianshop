// assets/js/header.js
// Dynamically injects the main navigation into the page, keeping markup DRY.
// This script should be loaded before other scripts that rely on the nav
// (auth.js for example) so that elements exist when those scripts run.

function renderHeader() {
    const html = `
<nav class="navbar navbar-expand-lg navbar-light fixed-top bg-white border-bottom shadow-sm">
  <div class="container pb-1 pt-1">
    <a class="navbar-brand" href="index.html">KYLIAN</a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="#navbarNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse justify-content-center" id="navbarNav">
      <ul class="navbar-nav">
        <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link" href="shop.html">Shop</a></li>
        <li class="nav-item"><a class="nav-link" href="about.html">About</a></li>
        <li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li>
      </ul>
    </div>
    <div class="d-flex align-items-center gap-3">
      <a href="#" class="text-dark fs-5"><i class="bi bi-search"></i></a>
      <a href="#" class="text-dark fs-5"><i class="bi bi-heart"></i></a>
      <a href="cart.html" class="text-dark fs-5 position-relative">
        <i class="bi bi-cart3"></i>
        <span id="cart-count" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style="font-size: 0.65rem; display: none;">0</span>
      </a>
    </div>
  </div>
</nav>
`;
    const container = document.getElementById('header-placeholder');
    if (container) container.innerHTML = html;
    markActiveLink();
}

function markActiveLink() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('#header-placeholder .navbar-nav .nav-link');
    links.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === path);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    // ensure auth buttons reflect current session immediately
    if (typeof refreshNavAuth === 'function') {
        refreshNavAuth();
    }
});
