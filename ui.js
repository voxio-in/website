// ui.js — slide-in fullscreen menu

const menu = document.getElementById('menu');
const openBtn = document.getElementById('menu-open');
const closeBtn = document.getElementById('menu-close');
const backdrop = document.getElementById('menu-backdrop');

if (menu && openBtn && closeBtn && backdrop) {
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    (open ? closeBtn : openBtn).focus({ preventScroll: true });
  };

  openBtn.addEventListener('click', () => setMenu(true));
  closeBtn.addEventListener('click', () => setMenu(false));
  backdrop.addEventListener('click', () => setMenu(false));

  menu.querySelectorAll('.menu__link').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
}
