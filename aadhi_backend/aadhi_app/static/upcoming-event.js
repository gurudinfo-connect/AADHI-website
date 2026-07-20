/* ==========================================================================
   AADHI Events & Entertainments — Upcoming Event Detail Page
   (bengaluru-corporate-wellness-run.html)
   Nav toggle, ripple buttons, scroll reveal, countdown to event date,
   gallery lightbox, FAQ accordion.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Data-driven background images ----------------
     Elements use data-bg="<url>" instead of an inline
     style="background-image:url(...)" so that Django's {% static %}
     tag never has to sit inside a style attribute (avoids editor/CSS
     tooling confusion over template syntax inside CSS). Mirrors the
     logic in script.js — this page loads upcoming-event.js instead, so
     the same conversion needs to happen here too. */
  document.querySelectorAll('[data-bg]').forEach(el => {
    const url = el.getAttribute('data-bg');
    if (url) el.style.backgroundImage = `url('${url}')`;
  });

  /* ---------------- Lazy-loaded background video (performance) ----------------
     The poster clip carries no src (no network request) until it nears the
     viewport, and pauses again once scrolled away. */
  const lazyVideos = document.querySelectorAll('video[data-lazy-src]');
  if (lazyVideos.length) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (!v.src && v.dataset.lazySrc) { v.src = v.dataset.lazySrc; v.load(); }
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '250px 0px', threshold: 0.1 });
    lazyVideos.forEach(v => videoObserver.observe(v));
  }

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
     load (short phone viewports, above-the-fold cards) never gets stuck
     invisible waiting for a scroll — see script.js for the full rationale. */
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

  /* ---------------- Countdown to event day: 15 November 2026 ---------------- */
  const eventTarget = new Date('2026-11-15T00:00:00+05:30').getTime();
  const uevDays = document.getElementById('uevDays');
  const uevHours = document.getElementById('uevHours');
  const uevMinutes = document.getElementById('uevMinutes');
  const uevSeconds = document.getElementById('uevSeconds');

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const now = Date.now();
    let diff = eventTarget - now;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (uevDays) uevDays.textContent = pad(days);
    if (uevHours) uevHours.textContent = pad(hours);
    if (uevMinutes) uevMinutes.textContent = pad(minutes);
    if (uevSeconds) uevSeconds.textContent = pad(seconds);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------------- Gallery lightbox (previous / next) ---------------- */
  const galleryGrid = document.getElementById('uevGalleryGrid');
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

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('#uevAccordion .acc-item').forEach(item => {
    const head = item.querySelector('.acc-head');
    const body = item.querySelector('.acc-body');
    head.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('#uevAccordion .acc-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.acc-body').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* ---------------- Registration modal (name / email / phone / address + Pay Now) ---------------- */
  const regModal = document.getElementById('regModal');
  const regModalClose = document.getElementById('regModalClose');
  const regModalTitle = document.getElementById('regModalTitle');
  const regModalPriceRegular = document.getElementById('regModalPriceRegular');
  const regModalPriceEarly = document.getElementById('regModalPriceEarly');
  const regPayAmount = document.getElementById('regPayAmount');
  const regModalForm = document.getElementById('regModalForm');
  const regFormSuccess = document.getElementById('regFormSuccess');
  const regToggleBtns = document.querySelectorAll('.reg-toggle-btn');

  if (regModal && regModalForm) {
    function applyCategory(category, priceRegular, priceEarly) {
      regModalTitle.textContent = category;
      regModalPriceRegular.textContent = priceRegular ? `Regular ${priceRegular}` : '';
      regModalPriceEarly.innerHTML = `${priceEarly} <small>Early Bird</small>`;
      if (regPayAmount) regPayAmount.textContent = priceEarly;

      regToggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
      });
    }

    regToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        applyCategory(btn.dataset.category, btn.dataset.priceRegular, btn.dataset.priceEarly);
      });
    });

    function openRegModal(trigger) {
      const category = trigger.dataset.category || regToggleBtns[0].dataset.category;
      const priceRegular = trigger.dataset.priceRegular || regToggleBtns[0].dataset.priceRegular;
      const priceEarly = trigger.dataset.priceEarly || regToggleBtns[0].dataset.priceEarly;

      applyCategory(category, priceRegular, priceEarly);

      regModalForm.reset();
      regModalForm.classList.remove('submitted');
      regFormSuccess.classList.remove('show');
      regModalForm.querySelectorAll('.form-row').forEach(row => row.classList.remove('invalid'));
      regModalForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = false);

      regModal.classList.add('open');
      regModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('reg-name').focus(), 300);
    }

    function closeRegModal() {
      regModal.classList.remove('open');
      regModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.reg-card-open').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        openRegModal(card);
      });
    });

    regModalClose.addEventListener('click', closeRegModal);
    regModal.addEventListener('click', (e) => { if (e.target === regModal) closeRegModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && regModal.classList.contains('open')) closeRegModal();
    });

    regModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameEl = document.getElementById('reg-name');
      const emailEl = document.getElementById('reg-email');
      const phoneEl = document.getElementById('reg-phone');
      const addressEl = document.getElementById('reg-address');

      const checks = [
        { el: nameEl, valid: nameEl.value.trim().length > 1 },
        { el: emailEl, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim()) },
        { el: phoneEl, valid: /^\d{10}$/.test(phoneEl.value.trim()) },
        { el: addressEl, valid: addressEl.value.trim().length > 5 }
      ];

      let allValid = true;
      checks.forEach(({ el, valid }) => {
        const row = el.closest('.form-row');
        row.classList.toggle('invalid', !valid);
        if (!valid) allValid = false;
      });

      if (!allValid) return;

      regModalForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = true);

      const activeCategory = document.querySelector('.reg-toggle-btn.active');
      const category = activeCategory ? activeCategory.dataset.category : regToggleBtns[0].dataset.category;

      const { data } = await AadhiAPI.registerForEvent('bengaluru-corporate-wellness-run', {
        category,
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        address: addressEl.value.trim(),
      });

      if (data && data.ok) {
        AadhiPayments.openCheckout(data.registration.id, {
          onSuccess: (paymentData) => {
            const bib = (paymentData && paymentData.registration && paymentData.registration.bib_number)
              || data.registration.bib_number;
            regFormSuccess.textContent =
              `🎉 Payment successful! Your bib number is ${bib}. A confirmation with your event QR code has been sent to your email.`;
            regFormSuccess.classList.add('show');
            setTimeout(closeRegModal, 3200);
          },
          onError: (err) => {
            regModalForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = false);
            alert(err.message || 'Payment could not be completed. Please try again.');
          },
        });
      } else {
        regModalForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = false);
        if (data && data.errors) {
          Object.entries(data.errors).forEach(([field, message]) => {
            const input = regModalForm.querySelector(`[name="${field}"]`);
            if (input) input.closest('.form-row').classList.add('invalid');
          });
          alert(Object.values(data.errors).join('\n'));
        } else if (data && data._serverError) {
          alert(`Server error (${data._status}). Please check that the database is migrated and seeded (python manage.py migrate && python manage.py seed_data), then check the Django console for the full error.`);
        } else {
          alert('Something went wrong. Please try again.');
        }
      }
    });
  }

  /* ---------------- Live phone number validation ----------------
     As soon as the person types something into a phone field, check it
     against a strict 10-digit mobile number pattern and turn the field
     red with an inline message immediately — instead of waiting until
     they hit submit. */
  (function initLivePhoneValidation(){
    const PHONE_PATTERN = /^[6-9]\d{9}$/;

    function showPhoneError(input, message){
      const row = input.closest('.form-row');
      if (row) row.classList.toggle('invalid', Boolean(message));

      let errorEl = row ? row.querySelector('.form-error') : null;
      if (!errorEl && row) {
        errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        row.appendChild(errorEl);
      }
      if (errorEl) errorEl.textContent = message || '';
    }

    function validatePhone(input){
      const raw = input.value.trim();
      const digitsOnly = raw.replace(/\D/g, '');

      if (!raw) { showPhoneError(input, ''); return; }

      if (digitsOnly !== raw) {
        showPhoneError(input, 'Mobile number should contain digits only.');
      } else if (digitsOnly.length !== 10) {
        showPhoneError(input, 'Please enter a valid 10-digit mobile number.');
      } else if (!PHONE_PATTERN.test(digitsOnly)) {
        showPhoneError(input, 'Please enter a valid mobile number.');
      } else {
        showPhoneError(input, '');
      }
    }

    document.querySelectorAll('input[type="tel"]').forEach(input => {
      input.addEventListener('input', () => validatePhone(input));
      input.addEventListener('blur', () => validatePhone(input));
    });
  })();

});
