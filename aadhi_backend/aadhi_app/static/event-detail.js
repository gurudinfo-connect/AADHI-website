/* ==========================================================================
   AADHI Events & Entertainments — Event detail pages
   (amaravati.html / telangana.html)
   Nav toggle, ripple buttons, scroll reveal, and gallery lightbox with
   previous / next navigation.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Data-driven background images ----------------
     Elements use data-bg="<url>" instead of an inline
     style="background-image:url(...)" so that Django's {% static %}
     tag never has to sit inside a style attribute (avoids editor/CSS
     tooling confusion over template syntax inside CSS). Mirrors the
     logic in script.js — this page loads event-detail.js instead, so
     the same conversion needs to happen here too. */
  document.querySelectorAll('[data-bg]').forEach(el => {
    const url = el.getAttribute('data-bg');
    if (url) el.style.backgroundImage = `url('${url}')`;
  });

  /* ---------------- Sticky navbar on scroll ---------------- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Mobile nav toggle ---------------- */
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open);
    });
  }

  /* ---------------- Ripple button effect ---------------- */
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      circle.classList.add('ripple-circle');
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
      circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 650);
    });
  });

  /* ---------------- Scroll-triggered reveal animations ----------------
     threshold/rootMargin kept forgiving so content already on-screen at
     load never gets stuck invisible waiting for a scroll — see script.js
     for the full rationale. */
  const revealEls = document.querySelectorAll('.reveal-up, .slide-left, .slide-right');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -1px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  requestAnimationFrame(() => {
    revealEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('in-view');
        revealObserver.unobserve(el);
      }
    });
  });

  /* Final fail-safe: nothing should be able to stay invisible forever. */
  setTimeout(() => {
    document.querySelectorAll('.reveal-up, .slide-left, .slide-right').forEach(el => {
      el.classList.add('in-view');
    });
  }, 2500);

  /* ---------------- Event gallery lightbox (previous / next) ---------------- */
  const galleryGrid = document.getElementById('eventGalleryGrid');
  const lightbox = document.getElementById('lightbox');
  const lightboxInner = document.getElementById('lightboxInner');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCaption = document.getElementById('lightboxCaption');

  if (galleryGrid && lightbox) {
    const items = Array.from(galleryGrid.querySelectorAll('.masonry-item'));
    let currentIndex = 0;

    function renderLightbox(index) {
      currentIndex = (index + items.length) % items.length;
      const ph = items[currentIndex].querySelector('.ph');
      lightboxInner.style.backgroundImage = ph.style.backgroundImage;
      if (lightboxCaption) lightboxCaption.textContent = items[currentIndex].dataset.label || '';
    }
    function openLightbox(index) {
      renderLightbox(index);
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
    }

    items.forEach((el, i) => {
      el.addEventListener('click', () => openLightbox(i));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(i); });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') renderLightbox(currentIndex - 1);
      if (e.key === 'ArrowRight') renderLightbox(currentIndex + 1);
    });
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); renderLightbox(currentIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); renderLightbox(currentIndex + 1); });
  }

});
