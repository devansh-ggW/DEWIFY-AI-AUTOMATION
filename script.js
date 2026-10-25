/*
  DEWIFY AI AUTOMATION — cinematic scroll controller
  Set CHECKOUT_URL to the verified product destination when available.
  Until then, every toolkit CTA safely falls back to the support email.
*/
const CHECKOUT_URL = '';
const CONTACT_EMAIL = 'dewifystores@gmail.com';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = Boolean(navigator.connection && navigator.connection.saveData);
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

function contactUrl(subject = 'DEWIFY AI AUTOMATION Toolkit') {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function configureProductLinks() {
  document.querySelectorAll('.js-product-cta').forEach((link) => {
    const destination = CHECKOUT_URL.trim() || contactUrl(link.dataset.contactSubject || 'DEWIFY AI AUTOMATION Toolkit');
    link.href = destination;
    if (CHECKOUT_URL.trim()) {
      link.target = '_blank';
      link.rel = 'noopener';
    } else {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  });
}

function setupHeaderAndMenu() {
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (!header || !menuToggle || !nav) return;

  const closeMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  const openMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
    nav.classList.add('is-open');
    document.body.classList.add('menu-open');
  };

  menuToggle.addEventListener('click', () => {
    menuToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) closeMenu(); }, { passive: true });
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

function setSceneAccessibility(sceneCopies, activeIndex, staticMode = false) {
  sceneCopies.forEach((scene, index) => {
    scene.setAttribute('aria-hidden', staticMode ? 'false' : String(index !== activeIndex));
  });
}

function setPlatformNode(node, x, y, opacity, scale = 1) {
  if (!node) return;
  node.style.setProperty('--node-opacity', opacity.toFixed(3));
  node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`);
}

function setRoute(path, draw) {
  if (path) path.style.setProperty('--route-draw', clamp(draw).toFixed(3));
}

function setupFilm() {
  const film = document.querySelector('[data-film]');
  if (!film) return;

  const sceneCopies = [...film.querySelectorAll('[data-scene-copy]')];
  const progressReadout = film.querySelector('[data-film-progress]');
  const paths = {
    wa: film.querySelector('.route--wa'),
    ig: film.querySelector('.route--ig'),
    fb: film.querySelector('.route--fb'),
    orbit: film.querySelector('.route--orbit:not(.route--orbit-two)'),
    orbitTwo: film.querySelector('.route--orbit-two'),
  };
  const nodes = {
    wa: film.querySelector('[data-platform="wa"]'),
    ig: film.querySelector('[data-platform="ig"]'),
    fb: film.querySelector('[data-platform="fb"]'),
    core: film.querySelector('[data-core-node]'),
  };
  const messages = [...film.querySelectorAll('.message-shape')];
  const video = film.querySelector('#film-video');
  let frame = 0;
  let latestProgress = 0;
  let filmVisible = false;
  let videoRunning = false;
  let videoPlaybackBlocked = false;

  const syncVideoPlayback = () => {
    if (!video) return;
    const shouldPlay = !reducedMotion && !saveData && !videoPlaybackBlocked && filmVisible && latestProgress >= .45 && document.visibilityState === 'visible';
    if (shouldPlay && !videoRunning) {
      videoRunning = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => { videoRunning = false; videoPlaybackBlocked = true; });
      }
    } else if (!shouldPlay && videoRunning) {
      video.pause();
      videoRunning = false;
    }
  };

  if (reducedMotion) {
    film.dataset.scene = '4';
    sceneCopies.forEach((scene) => scene.classList.add('is-active'));
    setSceneAccessibility(sceneCopies, 0, true);
    Object.values(paths).forEach((path) => setRoute(path, 1));
    setPlatformNode(nodes.wa, 285, 245, 1);
    setPlatformNode(nodes.ig, 285, 385, 1);
    setPlatformNode(nodes.fb, 285, 525, 1);
    nodes.core?.style.setProperty('--core-opacity', '1');
    messages.forEach((message) => message.style.setProperty('--message-opacity', '1'));
    return;
  }

  // The video is not scrub-seeked on scroll. That forces repeated decoder
  // seeks and can stutter. Instead, play the subtle loop only during the
  // convergence/product scenes and only while the pinned film is visible.
  if (video && !reducedMotion && !saveData && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { filmVisible = entry.isIntersecting; });
      syncVideoPlayback();
    }, { threshold: 0.01, rootMargin: '80px 0px' });
    videoObserver.observe(film.querySelector('.film-pin') || film);
    document.addEventListener('visibilitychange', syncVideoPlayback, { passive: true });
  } else if (video) {
    video.pause();
  }

  const update = () => {
    frame = 0;
    const rect = film.getBoundingClientRect();
    const scrollable = Math.max(1, film.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollable);
    latestProgress = progress;
    const sceneIndex = Math.min(6, Math.floor(progress * 7));

    film.dataset.scene = String(sceneIndex);
    sceneCopies.forEach((scene, index) => {
      scene.classList.toggle('is-active', index === sceneIndex);
      scene.classList.toggle('is-past', index < sceneIndex);
    });
    setSceneAccessibility(sceneCopies, sceneIndex);
    if (progressReadout) {
      const labels = ['00 — ARRIVAL', '01 — WHATSAPP', '02 — INSTAGRAM', '03 — FACEBOOK', '04 — CONVERGENCE', '05 — PRODUCT', '06 — FINISH'];
      progressReadout.textContent = labels[sceneIndex];
    }

    const warm = clamp((progress - .47) / .24);
    film.style.setProperty('--warm', warm.toFixed(3));
    setRoute(paths.wa, Math.max(.035, (progress - .06) / .19));
    setRoute(paths.ig, Math.max(.015, (progress - .20) / .22));
    setRoute(paths.fb, Math.max(.015, (progress - .34) / .23));
    setRoute(paths.orbit, (progress - .57) / .2);
    setRoute(paths.orbitTwo, (progress - .62) / .2);

    const convergence = clamp((progress - .5) / .23);
    const waStage = clamp((progress - .08) / .58);
    const igStage = clamp((progress - .21) / .51);
    const fbStage = clamp((progress - .35) / .44);
    const waX = waStage < .72 ? lerp(70, 390, waStage / .72) : lerp(390, 490, (waStage - .72) / .28);
    const igX = igStage < .72 ? lerp(70, 400, igStage / .72) : lerp(400, 490, (igStage - .72) / .28);
    const fbX = fbStage < .72 ? lerp(70, 390, fbStage / .72) : lerp(390, 490, (fbStage - .72) / .28);
    const waY = waStage < .72 ? lerp(124, 245, waStage / .72) : lerp(245, 385, (waStage - .72) / .28);
    const igY = igStage < .72 ? lerp(380, 385, igStage / .72) : lerp(385, 385, (igStage - .72) / .28);
    const fbY = fbStage < .72 ? lerp(636, 525, fbStage / .72) : lerp(525, 385, (fbStage - .72) / .28);
    setPlatformNode(nodes.wa, waX, waY, (.14 + clamp((progress - .06) / .1) * .86) * (1 - convergence * .2), 1 - convergence * .1);
    setPlatformNode(nodes.ig, igX, igY, (.1 + clamp((progress - .20) / .1) * .9) * (1 - convergence * .2), 1 - convergence * .1);
    setPlatformNode(nodes.fb, fbX, fbY, (.1 + clamp((progress - .34) / .1) * .9) * (1 - convergence * .2), 1 - convergence * .1);
    if (nodes.core) {
      nodes.core.style.setProperty('--core-opacity', (.12 + convergence * .88).toFixed(3));
      nodes.core.setAttribute('transform', `translate(490 385) scale(${(.72 + convergence * .28).toFixed(3)})`);
    }
    film.style.setProperty('--signal-opacity', clamp((progress - .57) / .19).toFixed(3));

    messages.forEach((message, index) => {
      const start = [.13, .3, .45][index];
      const local = clamp((progress - start) / .18);
      message.style.setProperty('--message-opacity', (local * (1 - convergence * .65)).toFixed(3));
      message.style.setProperty('--message-x', `${(local * 80).toFixed(1)}px`);
      message.style.setProperty('--message-y', `${(index - 1) * local * 22}px`);
      message.style.setProperty('--message-rotate', `${((index - 1) * (1 - local) * 4).toFixed(2)}deg`);
    });

    if (video) {
      // Scroll controls only the visual blend; playback remains continuous so
      // the browser can use its normal video decode path without seeking.
      const videoLocal = clamp((progress - .45) / .3);
      video.style.setProperty('--video-opacity', (videoLocal * .55).toFixed(3));
      syncVideoPlayback();
    }
  };

  const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update); };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  let pointerFrame = 0;
  let pointerEvent = null;
  film.addEventListener('pointermove', (event) => {
    if (!finePointer) return;
    pointerEvent = event;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointerEvent) return;
      const pointer = pointerEvent;
      const rect = film.getBoundingClientRect();
      const x = (pointer.clientX - rect.left) / rect.width - .5;
      const y = (pointer.clientY - rect.top) / rect.height - .5;
      film.style.setProperty('--pointer-x', `${(x * 7).toFixed(2)}px`);
      film.style.setProperty('--pointer-y', `${(y * 5).toFixed(2)}px`);
    });
  }, { passive: true });
  film.addEventListener('pointerleave', () => { film.style.setProperty('--pointer-x', '0px'); film.style.setProperty('--pointer-y', '0px'); });
  update();
}

function setupCoverLightbox() {
  const dialog = document.querySelector('#cover-lightbox');
  const opener = document.querySelector('[data-cover-open]');
  const closer = document.querySelector('[data-cover-close]');
  if (!dialog || !opener || !closer) return;

  opener.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      window.open('assets/dewify-toolkit-cover.webp', '_blank', 'noopener');
    }
  });
  closer.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

configureProductLinks();
setupHeaderAndMenu();
setupFilm();
setupCoverLightbox();
