/* ==========================================================================
   AADHI Events & Entertainments — Bengaluru Corporate Wellness Run 2026
   Main script — loader, nav, animations, counters, countdown, gallery,
   testimonials, accordion, form validation
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Data-driven background images ----------------
     Elements use data-bg="<url>" instead of an inline
     style="background-image:url(...)" so that Django's {% static %}
     tag never has to sit inside a style attribute (avoids editor/CSS
     tooling confusion over template syntax inside CSS). */
  document.querySelectorAll('[data-bg]').forEach(el => {
    const url = el.getAttribute('data-bg');
    if (url) el.style.backgroundImage = `url('${url}')`;
  });

  /* ---------------- Loading screen ---------------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('loaded'), 500);
  });
  // fallback in case 'load' already fired
  setTimeout(() => loader.classList.add('loaded'), 2500);

  /* ---------------- Hero video: fade in once playable ---------------- */
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    const markReady = () => heroVideo.classList.add('is-ready');
    heroVideo.addEventListener('canplay', markReady, { once: true });
    heroVideo.addEventListener('loadeddata', markReady, { once: true });
    // Fallback: reveal the poster/video area even if the network is slow or blocked
    setTimeout(markReady, 1800);
  }

  /* ---------------- Hero floating particles ---------------- */
  const heroParticles = document.getElementById('heroParticles');
  if (heroParticles) {
    const count = window.innerWidth < 640 ? 10 : 22;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'hp-particle';
      const size = 2 + Math.random() * 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      const duration = 9 + Math.random() * 10;
      p.style.animationDuration = duration + 's';
      p.style.animationDelay = (Math.random() * duration) + 's';
      heroParticles.appendChild(p);
    }
  }

  /* ---------------- Hero title word-reveal animation ---------------- */
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle) {
    const nodes = Array.from(heroTitle.childNodes);
    heroTitle.innerHTML = '';
    let wordIndex = 0;
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(' ').forEach(word => {
          if (!word) return;
          const span = document.createElement('span');
          span.className = 'hero-word';
          span.textContent = word;
          span.style.animationDelay = (0.25 + wordIndex * 0.09) + 's';
          heroTitle.appendChild(span);
          heroTitle.appendChild(document.createTextNode(' '));
          wordIndex++;
        });
      } else {
        const wrap = document.createElement('span');
        wrap.className = 'hero-word';
        wrap.appendChild(node.cloneNode(true));
        wrap.style.animationDelay = (0.25 + wordIndex * 0.09) + 's';
        heroTitle.appendChild(wrap);
        wordIndex++;
      }
    });
  }

  /* ---------------- Sticky navbar + scroll progress ---------------- */
  const navbar = document.getElementById('navbar');
  const scrollProgress = document.getElementById('scrollProgress');

  /* Watch the browser zoom level and drop the live backdrop-filter blur
     whenever it's not at 100%. Chromium re-rasterizes backdrop-filter at
     a low-res mip level on zoom, which shows up as blocky/washed-out
     pixels — swapping to a solid background sidesteps the bug entirely
     since there's nothing left to re-rasterize. Restores the blur once
     the user zooms back to 100%. Uses matchMedia(resolution) so it also
     catches OS-level/pinch zoom, with devicePixelRatio as a fallback. */

  /* ---------------- Active section highlighting ---------------- */
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = Array.from(navLinks)
    .map(l => document.getElementById(l.dataset.section))
    .filter(Boolean);

  // Cache each section's offsetTop instead of re-reading it on every scroll
  // frame (reading offsetTop forces a synchronous layout recalculation —
  // doing that on every scroll event is what was causing the nav lag).
  let sectionOffsets = [];
  function cacheSectionOffsets(){
    sectionOffsets = sections.map(sec => ({ id: sec.id, top: sec.offsetTop }));
  }
  cacheSectionOffsets();
  // Debounced: resize fires rapidly during pinch-zoom/orientation changes,
  // and running a synchronous layout read (offsetTop) on every single one
  // was competing with the scroll rAF loop for main-thread time.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(cacheSectionOffsets, 150);
  });

  function updateActiveNav(scrollPos){
    let currentId = sectionOffsets[0] ? sectionOffsets[0].id : null;
    sectionOffsets.forEach(sec => {
      if (sec.top <= scrollPos) currentId = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === currentId);
    });
  }

  function applyScrollState(){
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 40);

    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (y / docH) * 100 : 0;
    scrollProgress.style.width = pct + '%';

    updateActiveNav(y + 140);
  }

  // Throttle scroll work to one update per animation frame instead of
  // running on every raw scroll event — this removes the jank.
  let scrollTicking = false;
  function onScroll(){
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        applyScrollState();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  applyScrollState();

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
          alert(Object.values(data.errors).join('\n'));
        } else if (data && data._serverError) {
          alert(`Server error (${data._status}). Please check that the database is migrated and seeded (python manage.py migrate && python manage.py seed_data), then check the Django console for the full error.`);
        } else {
          alert('Something went wrong. Please try again.');
        }
      }
    });
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

    // (Previously bound twice on every link — once here and once again
    // right after this block — which fired the same close-menu handler
    // redundantly on every tap. Bound once now.)
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            navToggle.classList.remove('open');
            navToggle.setAttribute('aria-expanded', false);
        });
    });
}

  /* ---------------- Scroll-triggered reveal animations ----------------
     threshold/rootMargin tuned to be forgiving on short mobile viewports:
     a large -60px bottom margin combined with a 15% area threshold meant
     any element already sitting in the bottom ~60-100px band of a short
     phone screen at page load (e.g. hero content stacked below a taller
     sibling column) never intersected the shrunk root at all, so it sat
     forever at opacity:0 translated off-canvas — invisible content the
     user could only reveal by scrolling away and back. A near-zero
     threshold + tiny rootMargin means "any sliver visible" is enough to
     trigger, so nothing above/near the fold ever gets stuck. */
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

  /* Safety net: anything already on-screen at load (typical for hero /
     above-the-fold content, and for a mid-page reload) reveals right
     away instead of waiting on the observer's first callback, so there
     is never a flash of invisible content on initial paint. */
  requestAnimationFrame(() => {
    revealEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('in-view');
        revealObserver.unobserve(el);
      }
    });
  });

  /* Final fail-safe: whatever the cause (a very slow device, a paint
     that gets delayed, a browser quirk with IntersectionObserver), no
     card or image should be able to stay invisible forever. Anything
     still not revealed after 2.5s — including content added later, like
     the Completed Events cards below — is forced visible. This runs
     after all the synchronous DOM-building above (including the
     completedGrid render further down this file), so it also covers
     elements that don't exist yet at the point this line executes. */
  setTimeout(() => {
    document.querySelectorAll('.reveal-up, .slide-left, .slide-right').forEach(el => {
      el.classList.add('in-view');
    });
  }, 2500);

  /* ---------------- Ripple button effect ---------------- */
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function(e){
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

  /* ---------------- Animated number counters ---------------- */
  const statNums = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => counterObserver.observe(el));

  function animateCounter(el){
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('en-IN') + suffix;
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- Early Bird Countdown ---------------- */
  const countdownTarget = new Date('2026-08-15T23:59:59+05:30').getTime();
  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMinutes = document.getElementById('cdMinutes');
  const cdSeconds = document.getElementById('cdSeconds');

  function pad(n){ return String(n).padStart(2, '0'); }

  function updateCountdown(){
    const now = Date.now();
    let diff = countdownTarget - now;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (cdDays) cdDays.textContent = pad(days);
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMinutes) cdMinutes.textContent = pad(minutes);
    if (cdSeconds) cdSeconds.textContent = pad(seconds);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------------- Event highlights photo slider ---------------- */
  const eventHighlights = [
    { img: '/static/media/gallery/gallery-real-03.jpg', label: 'Runners On The Route' },
    { img: '/static/media/gallery/gallery-real-08.jpg', label: '1st Prize Presentation' },
    { img: '/static/media/gallery/gallery-real-07.jpg', label: 'Crowd Energy' },
    { img: '/static/media/gallery/gallery-real-11.jpg', label: 'Trophy Moment' },
    { img: '/static/media/gallery/gallery-real-16.jpg', label: 'Crossing The Finish' },
    { img: '/static/media/gallery/gallery-real-09.jpg', label: 'Podium Winners' },
    { img: '/static/media/gallery/gallery-real-20.jpg', label: '5K Finishers Squad' },
    { img: '/static/media/gallery/gallery-real-13.jpg', label: 'Race Start' },
    { img: '/static/media/gallery/gallery-real-21.jpg', label: 'Team Celebration On Stage' },
    { img: '/static/media/gallery/gallery-real-01.jpg', label: 'Medal Moment' },
  ];
  const highlightsSlider = document.getElementById('highlightsSlider');
  function buildHighlightsSlider(){
    if (!highlightsSlider) return;
    const set = [...eventHighlights, ...eventHighlights]; // duplicate for seamless loop
    highlightsSlider.innerHTML = set.map(item => `
      <div class="highlight-card">
        <img src="${item.img}" alt="${item.label}" loading="lazy">
        <div class="highlight-caption">${item.label}</div>
      </div>
    `).join('');
  }
  buildHighlightsSlider();

  /* ---------------- Gallery grid + lightbox ----------------
     Placeholder photography (Unsplash, royalty-free) — replace src values
     with real event photos whenever they're ready. */
  const galleryItems = [
    { img: '/static/media/gallery/gallery-real-01.jpg', label: 'Medal Moment', h: 260 },
    { img: '/static/media/gallery/gallery-real-02.jpg', label: 'Event Team On Stage', h: 230 },
    { img: '/static/media/gallery/gallery-real-03.jpg', label: 'Runners On The Route', h: 300 },
    { img: '/static/media/gallery/gallery-real-04.jpg', label: 'Winners Celebration', h: 210 },
    { img: '/static/media/gallery/gallery-real-05.jpg', label: 'Race Day Warm-Up', h: 260 },
    { img: '/static/media/gallery/gallery-real-06.jpg', label: 'Amaravathi Finishers', h: 220 },
    { img: '/static/media/gallery/gallery-real-07.jpg', label: 'Crowd Energy', h: 280 },
    { img: '/static/media/gallery/gallery-real-08.jpg', label: '1st Prize Presentation', h: 250 },
    { img: '/static/media/gallery/gallery-real-09.jpg', label: 'Podium Winners', h: 200 },
    { img: '/static/media/gallery/gallery-real-10.jpg', label: 'Runners Celebration', h: 240 },
    { img: '/static/media/gallery/gallery-real-11.jpg', label: 'Trophy Moment', h: 260 },
    { img: '/static/media/gallery/gallery-real-12.jpg', label: 'Category Winners', h: 200 },
    { img: '/static/media/gallery/gallery-real-13.jpg', label: 'Race Start', h: 230 },
    { img: '/static/media/gallery/gallery-real-14.jpg', label: 'Finisher Medals', h: 280 },
    { img: '/static/media/gallery/gallery-real-15.jpg', label: 'Fitness Spirit', h: 210 },
    { img: '/static/media/gallery/gallery-real-16.jpg', label: 'Crossing The Finish', h: 250 },
    { img: '/static/media/gallery/gallery-real-17.jpg', label: 'Morning Run', h: 220 },
    { img: '/static/media/gallery/gallery-real-18.jpg', label: 'On The Course', h: 260 },
    { img: '/static/media/gallery/gallery-real-19.jpg', label: 'Winner Prize Presentation', h: 230 },
    { img: '/static/media/gallery/gallery-real-20.jpg', label: '5K Finishers Squad', h: 280 },
    { img: '/static/media/gallery/gallery-real-21.jpg', label: 'Team Celebration On Stage', h: 240 },
    { type: 'video', src: '/static/media/gallery/gallery-video-1.mp4', label: 'Event Highlights Reel', h: 300 },
    { type: 'video', src: '/static/media/gallery/gallery-video-2.mp4', label: 'Race Day Moments', h: 260 },
    { type: 'video', src: '/static/media/gallery/gallery-video-3.mp4', label: 'On The Route', h: 230 },
  ];

  const masonryGrid = document.getElementById('masonryGrid');
  function buildGallery(){
    if (!masonryGrid) return;
    masonryGrid.innerHTML = galleryItems.map((item, i) => `
      <div class="masonry-item" data-index="${i}" tabindex="0" role="button" aria-label="View ${item.label} ${item.type === 'video' ? 'video' : 'photo'}">
        ${item.type === 'video'
          ? `<video class="ph gallery-video-thumb" style="height:${item.h}px" data-lazy-src="${item.src}" muted loop playsinline preload="none"></video>`
          : `<div class="ph" style="height:${item.h}px;background-image:url('${item.img}')"></div>`}
        <span class="masonry-caption">${item.label}</span>
      </div>
    `).join('');

    masonryGrid.querySelectorAll('.masonry-item').forEach(el => {
      el.addEventListener('click', () => openLightbox(Number(el.dataset.index)));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(Number(el.dataset.index)); });
    });
  }
  buildGallery();

  /* ---------------- Lightbox (with previous/next navigation) ---------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxInner = document.getElementById('lightboxInner');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCaption = document.getElementById('lightboxCaption');
  let currentGalleryIndex = 0;

  function renderLightbox(index){
    const item = galleryItems[(index + galleryItems.length) % galleryItems.length];
    currentGalleryIndex = (index + galleryItems.length) % galleryItems.length;
    if (item.type === 'video') {
      lightboxInner.style.backgroundImage = 'none';
      lightboxInner.innerHTML = `<video class="lightbox-video" src="${item.src}" controls autoplay playsinline></video>`;
    } else {
      lightboxInner.innerHTML = '';
      lightboxInner.style.backgroundImage = `url('${item.img}')`;
    }
    if (lightboxCaption) lightboxCaption.textContent = item.label;
  }
  function openLightbox(index){
    renderLightbox(index);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    const playingVideo = lightboxInner.querySelector('video');
    if (playingVideo) playingVideo.pause();
  }
  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') renderLightbox(currentGalleryIndex - 1);
      if (e.key === 'ArrowRight') renderLightbox(currentGalleryIndex + 1);
    });
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); renderLightbox(currentGalleryIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); renderLightbox(currentGalleryIndex + 1); });
  }

  /* ---------------- Completed Events (data-driven, reusable) ----------------
     To add more completed events later, add another object here — the card
     grid renders from it automatically. Each whole card links to a dedicated
     event details page rather than opening a popup. */
  const completedEvents = [
    {
      video: 'completed-amaravati.mp4',
      image: '/static/media/completed-events/completed-amaravati.jpg',
      title: 'Amaravati 10K Run 2026',
      location: 'Amaravati, Andhra Pradesh',
      status: 'Completed',
      summary: 'Successfully organized a large-scale 10K running event bringing together runners, fitness enthusiasts, families and corporate participants to promote health, fitness and community spirit.',
      link: 'amaravati.html'
    },
    {
      video: 'completed-telangana.mp4',
      image: '/static/media/completed-events/completed-telangana.jpg',
      title: 'Telangana Half Marathon 2026',
      location: 'Hyderabad, Telangana',
      status: 'Completed',
      summary: 'A professionally organized half marathon featuring multiple race categories, excellent race management, hydration support, timing systems and thousands of participants.',
      link: 'telangana.html'
    }
  ];

  const completedGrid = document.getElementById('completedGrid');
  if (completedGrid) {
    completedGrid.innerHTML = completedEvents.map((ev, i) => `
      <a href="${ev.link}" class="completed-card-lg glass hover-lift reveal-up event-card-link" data-delay="${i + 1}">
        <div class="event-img-ph completed-video-wrap">
          <img class="completed-card-img" src="${ev.image}" alt="${ev.title}" loading="lazy">
          <span class="completed-badge">${ev.status}</span>
        </div>
        <div class="event-body">
          <h3>${ev.title}</h3>
          <div class="event-meta"><span>📍 ${ev.location}</span></div>
          <p class="completed-desc">${ev.summary}</p>
        </div>
      </a>
    `).join('');

    // dynamically inserted cards need to be handed to the scroll-reveal observer
    completedGrid.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));
  }

  /* ---------------- Lazy-loaded background videos (performance) ----------------
     Gallery clips and completed-event clips sit below the fold, so they carry
     no src (and no network request) until they scroll near the viewport.
     Playback pauses again once a clip scrolls away, so only the video(s)
     currently on screen are ever decoding. */
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

  /* ---------------- Testimonial auto-slider ---------------- */
  const track = document.getElementById('testimonialTrack');
  const dotsWrap = document.getElementById('testimonialDots');
  const slides = track ? track.children.length : 0;
  let activeSlide = 0;
  let testimonialTimer;

  if (track && slides) {
    for (let i = 0; i < slides; i++) {
      const dot = document.createElement('button');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.addEventListener('click', () => { goToSlide(i); resetTimer(); });
      dotsWrap.appendChild(dot);
    }

    function goToSlide(i){
      activeSlide = (i + slides) % slides;
      track.style.transform = `translateX(-${activeSlide * 100}%)`;
      dotsWrap.querySelectorAll('.dot').forEach((d, idx) => d.classList.toggle('active', idx === activeSlide));
    }
    function nextSlide(){ goToSlide(activeSlide + 1); }
    function resetTimer(){
      clearInterval(testimonialTimer);
      testimonialTimer = setInterval(nextSlide, 5000);
    }
    resetTimer();
  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.acc-item').forEach(item => {
    const head = item.querySelector('.acc-head');
    const body = item.querySelector('.acc-body');
    head.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.acc-body').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* ---------------- Contact form validation ---------------- */
  const form = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  function setError(fieldName, message){
    const errorEl = form.querySelector(`.form-error[data-for="${fieldName}"]`);
    const row = errorEl ? errorEl.closest('.form-row') : null;
    if (errorEl) errorEl.textContent = message || '';
    if (row) row.classList.toggle('invalid', Boolean(message));
  }

  const fieldEls = {
    name: document.getElementById('cf-name'),
    email: document.getElementById('cf-email'),
    phone: document.getElementById('cf-phone'),
    message: document.getElementById('cf-message')
  };

  function validateForm(){
    let valid = true;
    const name = fieldEls.name.value.trim();
    const email = fieldEls.email.value.trim();
    const phone = fieldEls.phone.value.trim();
    const message = fieldEls.message.value.trim();

    if (!name) { setError('name', 'Please enter your name.'); valid = false; }
    else setError('name', '');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) { setError('email', 'Please enter a valid email address.'); valid = false; }
    else setError('email', '');

    const phonePattern = /^[6-9]\d{9}$/;
    if (!phone || !phonePattern.test(phone.replace(/\D/g, '').slice(-10))) {
      setError('phone', 'Please enter a valid 10-digit mobile number.'); valid = false;
    } else setError('phone', '');

    if (!message) { setError('message', 'Please add a short message.'); valid = false; }
    else setError('message', '');

    return valid;
  }
if(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formSuccess.classList.remove('show');
    if (!validateForm()) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const { data } = await AadhiAPI.contact({
      name: fieldEls.name.value.trim(),
      email: fieldEls.email.value.trim(),
      phone: fieldEls.phone.value.trim(),
      message: fieldEls.message.value.trim(),
    });

    if (submitBtn) submitBtn.disabled = false;

    if (data && data.ok) {
      formSuccess.classList.add('show');
      form.reset();
      setTimeout(() => formSuccess.classList.remove('show'), 6000);
    } else if (data && data.errors) {
      Object.keys(data.errors).forEach(key => setError(key, data.errors[key]));
    }
  });

  Object.keys(fieldEls).forEach(field => {
    fieldEls[field].addEventListener('input', () => setError(field, ''));
  });
}

/* ---------------- Live phone number validation (site-wide) ----------------
   Applies to every phone field (type="tel") on every page — registration
   modals, the sponsor form, contact form, sign up, etc. As soon as the
   person has typed something, the field is checked against a strict
   10-digit mobile number pattern. An invalid number (wrong length, extra
   digits, letters, etc.) turns the field's border red immediately and
   shows an inline "enter a valid number" message, without waiting for
   form submission. */
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


