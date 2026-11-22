// Theme toggle (remembers the choice in this browser), menu pane, sticky-nav border, footer year.
(function () {
  const root = document.documentElement;
  const KEY = "theme";
  try { const t = localStorage.getItem(KEY); if (t === "light" || t === "dark") root.dataset.theme = t; } catch {}

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-theme-toggle]")) return;
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch {}
  });

  // Menu pane: a modal <dialog>, so the browser traps focus, Esc closes it and focus returns to the button.
  const menu = document.getElementById("site-menu");
  const opener = document.querySelector("[data-menu-open]");
  if (menu && opener && typeof menu.showModal === "function") {
    opener.addEventListener("click", () => { menu.showModal(); opener.setAttribute("aria-expanded", "true"); });
    menu.addEventListener("close", () => opener.setAttribute("aria-expanded", "false"));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("[data-menu-close]")) return menu.close();
      // A click on the backdrop lands on the dialog element itself, outside its box.
      const r = menu.getBoundingClientRect();
      if (e.target === menu && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) menu.close();
    });
  } else if (opener) {
    opener.hidden = true; // no <dialog> support: hide a button that cannot open anything
  }

  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  for (const el of document.querySelectorAll("[data-year]")) el.textContent = new Date().getFullYear();
})();
