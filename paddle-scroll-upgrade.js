/*
 * DEWIFY AI AUTOMATION — Paddle checkout + lightweight scroll cinema
 * Static-site friendly: no build tools, backend, or extra runtime libraries.
 */
(() => {
  'use strict';

  const PRODUCT_ID = 'pro_01m5svyv0ekfttpxnph4731qs1';
  const PRICE_ID = 'pri_01m5sw19g5p1tyewmhk8tbv54c';
  // Paddle client-side tokens are designed for browser use (never put an API key here).
  const PADDLE_CLIENT_TOKEN = 'live_9cc9eb9158aae539dcd93c3b9b4';
  const SUPPORT_EMAIL = 'dewifystores@gmail.com';
  const PADDLE_SDK_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);

  let toastTimeout = 0;
  let checkoutReady = false;
  let checkoutInitError = null;
  let paddlePromise = null;

  function showToast(message, duration = 5200) {
    const toast = document.querySelector('[data-dewify-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), duration);
  }

  function addStylesheet() {
    const script = document.querySelector('script[data-dewify-paddle-script]');
    const cssUrl = new URL('paddle-scroll-upgrade.css', script?.src || window.location.href).href;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((link) => link.href === cssUrl)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.dataset.dewifyScrollUpgrade = 'true';
    document.head.appendChild(link);
  }

  function ensureProgressAndToast() {
    if (!document.querySelector('.cinema-scroll-progress')) {
      const progress = document.createElement('div');
      progress.className = 'cinema-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      progress.innerHTML = '<span></span>';
      document.body.appendChild(progress);
    }
    if (!document.querySelector('[data-dewify-toast]')) {
      const toast = document.createElement('div');
      toast.className = 'dewify-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.dataset.dewifyToast = 'true';
      document.body.appendChild(toast);
    }
  }

  function buildPriceUI() {
    const productCopy = document.querySelector('.product-copy');
    const description = productCopy?.querySelector('.product-description');
    if (description && !productCopy.querySelector('.localized-price-block')) {
      const block = document.createElement('div');
      block.className = 'localized-price-block';
      block.setAttribute('aria-live', 'polite');
      block.innerHTML = [
        '<span class="localized-price-kicker">YOUR LOCAL PRICE</span>',
        '<strong class="localized-price-value">Loading price…</strong>',
        '<span class="localized-price-note">One-time purchase. The final payable total, including applicable taxes, is confirmed at checkout.</span>'
      ].join('');
      description.insertAdjacentElement('afterend', block);
    }

    document.querySelectorAll('.js-product-cta').forEach((link) => {
      if (link.closest('.site-nav') || link.querySelector('.js-inline-local-price')) return;
      const price = document.createElement('span');
      price.className = 'js-inline-local-price';
      price.textContent = '';
      price.setAttribute('aria-label', 'Localized price');
      const arrow = link.querySelector('[aria-hidden="true"]');
      if (arrow) link.insertBefore(price, arrow);
      else link.appendChild(price);
    });
  }

  function setPriceLabels(text, isFallback = false) {
    document.querySelectorAll('.localized-price-value').forEach((node) => { node.textContent = text; });
    document.querySelectorAll('.js-inline-local-price').forEach((node) => {
      node.textContent = isFallback ? ' · View price at checkout' : ` · ${text}`;
    });
  }

  function loadPaddleSdk() {
    if (window.Paddle) return Promise.resolve(window.Paddle);
    return new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-dewify-paddle-sdk]');
      if (script) {
        if (script.dataset.loaded === 'true' && window.Paddle) return resolve(window.Paddle);
        script.addEventListener('load', () => window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js loaded without the Paddle object')), { once: true });
        script.addEventListener('error', () => reject(new Error('Paddle.js failed to load')), { once: true });
        return;
      }
      script = document.createElement('script');
      script.src = PADDLE_SDK_URL;
      script.async = true;
      script.dataset.dewifyPaddleSdk = 'true';
      script.onload = () => {
        script.dataset.loaded = 'true';
        window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js loaded without the Paddle object'));
      };
      script.onerror = () => reject(new Error('Paddle.js failed to load'));
      document.head.appendChild(script);
    });
  }

  async function initializeCheckout() {
    const Paddle = await loadPaddleSdk();
    if (!Paddle?.Checkout?.open) throw new Error('Paddle checkout methods are unavailable');

    if (!window.__DEWIFY_PADDLE_INITIALIZED) {
      Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      window.__DEWIFY_PADDLE_INITIALIZED = true;
    }

    // Do NOT make checkout depend on PricePreview succeeding. A localized-price
    // preview is cosmetic; Paddle Checkout is independently usable.
    checkoutReady = true;
    return Paddle;
  }

  async function loadLocalizedPrice(Paddle) {
    try {
      if (typeof Paddle.PricePreview !== 'function') throw new Error('Paddle price preview method is unavailable');
      const preview = await Paddle.PricePreview({ items: [{ priceId: PRICE_ID, quantity: 1 }] });
      const lineItems = preview?.data?.details?.lineItems || [];
      const matchingItem = lineItems.find((item) => item.product?.id === PRODUCT_ID) || lineItems[0];
      const formatted = matchingItem?.formattedTotals?.subtotal;
      if (typeof formatted === 'string' && formatted.trim()) {
        setPriceLabels(formatted.trim());
      } else {
        setPriceLabels('See checkout for your local price', true);
      }
    } catch (error) {
      // A preview error must never disable payment checkout.
      setPriceLabels('See checkout for your local price', true);
      console.warn('DEWIFY localized price preview failed (checkout can still work):', error?.message || error);
    }
  }

  function setupCheckoutButtons() {
    document.addEventListener('click', async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('.js-product-cta');
      if (!button) return;

      // Keep mailto fallbacks for keyboard/context-menu use, but run real checkout
      // on ordinary clicks. Prevent the mail client from hijacking the click while
      // Paddle is still loading.
      event.preventDefault();
      if (button.dataset.checkoutBusy === 'true') return;
      button.dataset.checkoutBusy = 'true';

      try {
        const Paddle = await paddlePromise;
        if (!checkoutReady || !Paddle?.Checkout?.open) throw checkoutInitError || new Error('Paddle is not ready');
        Paddle.Checkout.open({ items: [{ priceId: PRICE_ID, quantity: 1 }] });
      } catch (error) {
        console.error('DEWIFY Paddle checkout failed:', error?.message || error);
        showToast('Checkout could not start. Confirm this live website domain is approved in Paddle, and that the price is active. Support: ' + SUPPORT_EMAIL);
      } finally {
        delete button.dataset.checkoutBusy;
      }
    }, true);
  }

  function setupScrollCinema() {
    const progressBar = document.querySelector('.cinema-scroll-progress > span');
    const revealSelectors = [
      '.calm-section .eyebrow', '.calm-section h2', '.product-showcase', '.file-tree--large',
      '.workflow-steps article', '.setup-callout', '.faq-heading', '.faq-list details',
      '.finish-inner > *', '.site-footer .footer-top', '.site-footer .footer-bottom'
    ];

    if (!reducedMotion && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('cinema-enhanced');
      const revealTargets = [...new Set(revealSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in-view');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      revealTargets.forEach((element, index) => {
        element.classList.add('cinema-reveal');
        element.style.setProperty('--cinema-delay', `${(index % 4) * 70}ms`);
        revealObserver.observe(element);
      });

      const parallaxTargets = [...document.querySelectorAll('.product-artwork, .file-tree--large, .workflow-steps article, .finish-inner h2')];
      parallaxTargets.forEach((element) => element.classList.add('cinema-parallax'));
      let rafId = 0;
      const updateScrollMotion = () => {
        rafId = 0;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        if (progressBar) progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / maxScroll))})`;
        if (saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return;
        const viewHeight = window.innerHeight || 1;
        parallaxTargets.forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > viewHeight + 100) return;
          const offset = (rect.top + rect.height / 2 - viewHeight / 2) / viewHeight;
          const strength = element.matches('.product-artwork') ? 15 : 8;
          element.style.setProperty('--cinema-y', `${Math.max(-strength, Math.min(strength, -offset * strength)).toFixed(2)}px`);
        });
      };
      const requestUpdate = () => { if (!rafId) rafId = requestAnimationFrame(updateScrollMotion); };
      window.addEventListener('scroll', requestUpdate, { passive: true });
      window.addEventListener('resize', requestUpdate, { passive: true });
      updateScrollMotion();
    } else if (progressBar) {
      progressBar.style.transform = 'scaleX(0)';
    }
  }

  addStylesheet();
  ensureProgressAndToast();
  buildPriceUI();
  setupCheckoutButtons();
  setupScrollCinema();

  // Single initialization promise is shared by all CTA clicks. Start price
  // preview only after initialization, but handle its errors independently.
  paddlePromise = initializeCheckout()
    .then((Paddle) => {
      loadLocalizedPrice(Paddle); // intentionally not awaited
      return Paddle;
    })
    .catch((error) => {
      checkoutInitError = error;
      checkoutReady = false;
      setPriceLabels('See checkout for your local price', true);
      console.error('DEWIFY Paddle initialization failed:', error?.message || error);
      return Promise.reject(error);
    });
  // Attach a rejection handler to avoid an unhandled promise warning when no
  // visitor clicks a CTA; click handler still receives the original rejection.
  paddlePromise.catch(() => {});
})();
