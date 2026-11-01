(function () {
  'use strict';

  var PARTIAL_EVENT = 'partials:loaded';
  var initialized = false;

  var I18N_PATH = 'assets/i18n/';
  var SUPPORTED_LANGUAGES = ['en', 'es'];
  var DEFAULT_LANGUAGE = 'en';
  var STORAGE_KEY = 'terrenoclub:lang';
  var LANGUAGE_CHANGED_EVENT = 'i18n:language-changed';
  var translationsCache = {};
  var currentLanguage = null;
  var languagePromise = null;
  var INSTAGRAM_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink';
  var INSTAGRAM_LIMIT = 6;
  var INSTAGRAM_ENDPOINT =
    'https://graph.instagram.com/me/media?fields=' + INSTAGRAM_FIELDS + '&limit=' + INSTAGRAM_LIMIT;
  var INSTAGRAM_FALLBACK_LINK = 'https://www.instagram.com/terrenoclub/';
  var INSTAGRAM_PLACEHOLDER_MEDIA = [
    {
      src: 'images/padel-left.png',
      alt: 'Members playing padel at Terreno Club',
      href: INSTAGRAM_FALLBACK_LINK,
    },
    {
      src: 'images/swim-left.png',
      alt: 'Loungers beside the Terreno Club pool',
      href: INSTAGRAM_FALLBACK_LINK,
    },
    {
      src: 'images/food.jpg',
      alt: 'Dining setup on the Terreno Club terrace',
      href: INSTAGRAM_FALLBACK_LINK,
    },
    {
      src: 'images/membership-left.png',
      alt: 'Members gathering for a terrace dinner',
      href: INSTAGRAM_FALLBACK_LINK,
    },
    {
      src: 'images/contact.jpeg',
      alt: 'Poolside view of Terreno Club',
      href: INSTAGRAM_FALLBACK_LINK,
    },
  ];
  var BOOKING_WIDGET_ID = 'hors-hydra-e399f9fa-8f39-4696-bdbd-a4327394a6e6';
  var BOOKING_WIDGET_SCRIPT_SRC = 'https://reservation.dish.co/widget.js';
  var BOOKING_WIDGET_SCRIPT_ID = 'booking-widget-loader';
  var BOOKING_WIDGET_CONFIG = [
    ['eid', 'hydra-e399f9fa-8f39-4696-bdbd-a4327394a6e6'],
    ['tagid', BOOKING_WIDGET_ID],
    ['width', '100%'],
    ['height', ''],
    ['foregroundColor', ''],
    ['backgroundColor', '#f8f3d9'],
    ['linkColor', ''],
    ['errorColor', ''],
    ['primaryButtonForegroundColor', '#f3e7b0'],
    ['primaryButtonBackgroundColor', '#2b5f5a'],
    ['secondaryButtonForegroundColor', ''],
    ['secondaryButtonBackgroundColor', ''],
  ];
  var bookingScriptRequested = false;

  function dispatchLanguageChange(lang) {
    if (!lang) {
      return;
    }

    var detail = { language: lang };
    var event;

    try {
      event = new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: detail });
    } catch (error) {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(LANGUAGE_CHANGED_EVENT, true, true, detail);
    }

    window.dispatchEvent(event);
  }

  function isSupportedLanguage(lang) {
    return typeof lang === 'string' && SUPPORTED_LANGUAGES.indexOf(lang.toLowerCase()) !== -1;
  }

  function resolveTranslation(source, key) {
    if (!source || !key) {
      return null;
    }

    return key.split('.').reduce(function (accumulator, part) {
      if (accumulator && Object.prototype.hasOwnProperty.call(accumulator, part)) {
        return accumulator[part];
      }
      return null;
    }, source);
  }

  function getStoredLanguage() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return stored && isSupportedLanguage(stored) ? stored : null;
    } catch (error) {
      return null;
    }
  }

  function setStoredLanguage(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // ignore storage failures (private mode, etc.)
    }
  }

  function determineInitialLanguage() {
    var stored = getStoredLanguage();
    if (stored) {
      return stored;
    }

    var documentLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (isSupportedLanguage(documentLang)) {
      return documentLang;
    }

    var navigatorLang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
    if (isSupportedLanguage(navigatorLang)) {
      return navigatorLang;
    }

    return DEFAULT_LANGUAGE;
  }

  function loadTranslations(lang) {
    if (translationsCache[lang]) {
      return Promise.resolve(translationsCache[lang]);
    }

    return fetch(I18N_PATH + lang + '.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load translations for "' + lang + '" (' + response.status + ')');
        }
        return response.json();
      })
      .then(function (data) {
        translationsCache[lang] = data;
        return data;
      })
      .catch(function (error) {
        console.error('[i18n] Failed to load language', lang, error);
        if (lang !== DEFAULT_LANGUAGE) {
          return loadTranslations(DEFAULT_LANGUAGE);
        }
        throw error;
      });
  }

  function getPageKey() {
    var page = document.body ? document.body.getAttribute('data-page') : null;
    return page || 'home';
  }

  function applyHeadTranslations(dictionary, lang) {
    if (!dictionary || !dictionary.head) {
      return;
    }

    var pageKey = getPageKey();
    var headData = dictionary.head[pageKey] || dictionary.head.home;

    if (headData && headData.title) {
      document.title = headData.title;
    }

    if (headData && headData.description) {
      var metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', headData.description);
      }
    }

    if (headData && headData.ogTitle) {
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', headData.ogTitle);
      }
    }

    if (headData && headData.ogDescription) {
      var ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', headData.ogDescription);
      }
    }

    document.documentElement.setAttribute('lang', lang);
  }

  function applyAttributeTranslations(element, dictionary) {
    var mapping = element.getAttribute('data-i18n-attr');
    if (!mapping) {
      return;
    }

    mapping.split(';').forEach(function (entry) {
      var parts = entry.split(':');
      if (parts.length !== 2) {
        return;
      }

      var attribute = parts[0].trim();
      var key = parts[1].trim();
      if (!attribute || !key) {
        return;
      }

      var value = resolveTranslation(dictionary, key);
      if (value !== null && value !== undefined) {
        element.setAttribute(attribute, value);
      }
    });
  }

  function applyNodeTranslations(dictionary) {
    var textNodes = document.querySelectorAll('[data-i18n]');
    textNodes.forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      if (!key) {
        return;
      }

      var value = resolveTranslation(dictionary, key);
      if (value === null || value === undefined) {
        return;
      }

      var mode = node.getAttribute('data-i18n-mode');
      if (mode === 'html') {
        node.innerHTML = value;
      } else {
        node.textContent = value;
      }
    });

    var attributeNodes = document.querySelectorAll('[data-i18n-attr]');
    attributeNodes.forEach(function (node) {
      applyAttributeTranslations(node, dictionary);
    });
  }

  function syncLanguageSelectors(lang) {
    var selectors = document.querySelectorAll('[data-language-selector]');
    if (!selectors.length) {
      return;
    }

    selectors.forEach(function (selector) {
      if (selector.value !== lang) {
        selector.value = lang;
      }
    });
  }

  function initLanguageSelectors() {
    var selectors = document.querySelectorAll('[data-language-selector]');
    if (!selectors.length) {
      return;
    }

    selectors.forEach(function (selector) {
      if (selector.getAttribute('data-language-attached') === 'true') {
        return;
      }

      selector.addEventListener('change', function (event) {
        var requested = event.target.value;
        setLanguage(requested);
      });

      selector.setAttribute('data-language-attached', 'true');
    });
  }

  function applyTranslations(dictionary, lang) {
    applyHeadTranslations(dictionary, lang);
    applyNodeTranslations(dictionary);
    initLanguageSelectors();
    syncLanguageSelectors(lang);
  }

  function setLanguage(lang) {
    var normalized = typeof lang === 'string' ? lang.toLowerCase() : DEFAULT_LANGUAGE;
    if (!isSupportedLanguage(normalized)) {
      normalized = DEFAULT_LANGUAGE;
    }

    if (normalized === currentLanguage && translationsCache[normalized]) {
      syncLanguageSelectors(normalized);
      return Promise.resolve();
    }

    return loadTranslations(normalized).then(function (dictionary) {
      currentLanguage = normalized;
      applyTranslations(dictionary, normalized);
      setStoredLanguage(normalized);
      dispatchLanguageChange(normalized);
    });
  }

  function initI18n() {
    if (languagePromise) {
      return languagePromise;
    }

    var initialLanguage = determineInitialLanguage();
    languagePromise = setLanguage(initialLanguage).catch(function (error) {
      console.error('[i18n] Unable to apply language', error);
    });

    return languagePromise;
  }

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function initPageFeatures() {
    if (initialized) {
      return;
    }

    var nav = document.querySelector('nav');
    if (!nav) {
      return;
    }

    var drawer = document.querySelector('[data-drawer]');
    var drawerToggle = document.querySelector('[data-drawer-toggle]');
    var drawerOverlay = document.querySelector('[data-drawer-overlay]');
    var desktopMedia = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 960px)') : null;
    var drawerOpenClass = 'is-open';
    var toggleActiveClass = 'is-active';
    var bodyOpenClass = 'drawer-open';

    var setDrawerState = function (open) {
      if (!drawer) {
        return;
      }

      var isOpen = Boolean(open);
      drawer.classList.toggle(drawerOpenClass, isOpen);
      drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

      if (drawerToggle) {
        drawerToggle.classList.toggle(toggleActiveClass, isOpen);
        drawerToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }

      if (drawerOverlay) {
        if (isOpen) {
          drawerOverlay.classList.add('is-visible');
          drawerOverlay.removeAttribute('hidden');
        } else {
          drawerOverlay.classList.remove('is-visible');
          drawerOverlay.setAttribute('hidden', '');
        }
      }

      document.body.classList.toggle(bodyOpenClass, isOpen);
    };

    if (drawerToggle && drawer) {
      drawerToggle.addEventListener('click', function () {
        setDrawerState(!drawer.classList.contains(drawerOpenClass));
      });
    }

    if (drawerOverlay && drawer) {
      drawerOverlay.addEventListener('click', function () {
        setDrawerState(false);
        if (drawerToggle) {
          drawerToggle.focus();
        }
      });
    }

    if (drawer) {
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' || event.key === 'Esc') {
          if (drawer.classList.contains(drawerOpenClass)) {
            setDrawerState(false);
            if (drawerToggle) {
              drawerToggle.focus();
            }
          }
        }
      });
    }

    if (desktopMedia && drawer) {
      var handleDesktopChange = function () {
        setDrawerState(false);
      };

      if (typeof desktopMedia.addEventListener === 'function') {
        desktopMedia.addEventListener('change', handleDesktopChange);
      } else if (typeof desktopMedia.addListener === 'function') {
        desktopMedia.addListener(handleDesktopChange);
      }

      handleDesktopChange();
    } else if (drawer) {
      setDrawerState(false);
    }

    initialized = true;

    var titleGraphics = document.querySelectorAll('.section-media .title-graphic');
    var animatedElements = document.querySelectorAll('[data-scroll-animate]');
    var sections = Array.prototype.slice.call(document.querySelectorAll('main > section[id]'));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav a[href^="#"]'));
    var navTargets = new Map(
      navLinks.map(function (link) {
        var href = link.getAttribute('href') || '';
        var targetId = href.replace('#', '');
        var sectionId = link.getAttribute('data-section-target') || targetId;

        return [sectionId, link];
      })
    );

    if (drawer) {
      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          setDrawerState(false);
        });
      });
    }
    var currentActiveId = null;

    var prefersReducedMotionQuery =
      'matchMedia' in window ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var prefersReducedMotion = prefersReducedMotionQuery ? prefersReducedMotionQuery.matches : false;

    function setActiveSection(id) {
      if (!id || currentActiveId === id || !navTargets.has(id)) {
        return;
      }

      currentActiveId = id;
      navLinks.forEach(function (link) {
        var linkId = link.getAttribute('href').replace('#', '');
        link.classList.toggle('is-active', linkId === id);
      });

      if (document.body) {
        document.body.classList.toggle('contact-active', id === 'contact');
      }
    }

    var revealTargets = Array.from(new Set([].concat(Array.from(titleGraphics), Array.from(animatedElements))));

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      var revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          // The pool section is very tall and anchor navigation stops it 140px
          // below the top of the viewport. With a 0.35 threshold the observer
          // never reported it as visible on shorter laptops, so the section
          // stayed hidden. Lower the requirement so large blocks reveal once a
          // modest portion is in view.
          threshold: 0.15,
        }
      );

      revealTargets.forEach(function (target) {
        revealObserver.observe(target);
      });
    } else {
      revealTargets.forEach(function (target) {
        target.classList.add('is-visible');
      });
    }

    var sectionThresholds = Array.from({ length: 21 }, function (_, index) {
      return index / 20;
    });

    if ('IntersectionObserver' in window && sections.length && navLinks.length) {
      var sectionVisibility = sections.reduce(function (acc, section) {
        acc[section.id] = 0;
        return acc;
      }, {});

      var sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            sectionVisibility[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
            entry.target.classList.toggle('is-section-active', entry.isIntersecting);
          });

          var mostVisible = Object.keys(sectionVisibility).reduce(function (top, key) {
            var ratio = sectionVisibility[key];

            if (!top || ratio > top.ratio) {
              return { id: key, ratio: ratio };
            }

            return top;
          }, null);

          if (mostVisible && mostVisible.ratio > 0) {
            setActiveSection(mostVisible.id);
          }
        },
        { threshold: sectionThresholds }
      );

      sections.forEach(function (section) {
        sectionObserver.observe(section);
      });
    } else {
      sections.forEach(function (section, index) {
        section.classList.add('is-section-active');
        if (index === 0) {
          setActiveSection(section.id);
        }
      });
    }

    if (!prefersReducedMotion && titleGraphics.length) {
      var ticking = false;

      var updateParallax = function () {
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        titleGraphics.forEach(function (graphic) {
          var figure = graphic.parentElement;
          if (!figure) {
            return;
          }

          var rect = figure.getBoundingClientRect();

          if (rect.bottom < 0 || rect.top > viewportHeight) {
            graphic.style.setProperty('--parallax-delta', '0px');
            return;
          }

          var figureCenter = rect.top + rect.height / 2;
          var viewportCenter = viewportHeight / 2;
          var distance = figureCenter - viewportCenter;
          var normalized = Math.max(-1, Math.min(1, distance / viewportHeight));
          var offset = normalized * -20;

          graphic.style.setProperty('--parallax-delta', offset + 'px');
        });

        ticking = false;
      };

      var requestParallaxUpdate = function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateParallax);
        }
      };

      requestParallaxUpdate();
      window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
      window.addEventListener('resize', requestParallaxUpdate);
    } else {
      titleGraphics.forEach(function (graphic) {
        graphic.style.setProperty('--parallax-delta', '0px');
      });
    }

    var heroSection = document.getElementById('presentacion');
    var bodyElement = document.body;
    var heroLogoHiddenClass = 'hero-logo-hidden';

    if (heroSection && bodyElement) {
      var getScrollPosition = function () {
        return window.pageYOffset || document.documentElement.scrollTop || 0;
      };

      var updateHeroLogoVisibility = function () {
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        var scrollPosition = getScrollPosition();
        var heroRect = heroSection.getBoundingClientRect();
        var heroAlmostFinished = heroRect.bottom <= viewportHeight * 0.25;
        var scrolledHalfViewport = scrollPosition >= viewportHeight * 0.5;
        var shouldShowLogo = heroAlmostFinished || scrolledHalfViewport;

        bodyElement.classList.toggle(heroLogoHiddenClass, !shouldShowLogo);
      };

      bodyElement.classList.add(heroLogoHiddenClass);
      window.addEventListener('scroll', updateHeroLogoVisibility, { passive: true });
      window.addEventListener('resize', updateHeroLogoVisibility);
      updateHeroLogoVisibility();
    }

    if (!currentActiveId && sections.length) {
      setActiveSection(sections[0].id);
    }
  }

  function truncateCaption(text, index) {
    var fallback = 'Terreno Club Instagram photo ' + (index + 1);
    if (!text) {
      return fallback;
    }

    var normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return fallback;
    }

    if (normalized.length > 140) {
      normalized = normalized.slice(0, 137).trim() + '…';
    }

    return normalized;
  }

  function buildInstagramRequest(config) {
    if (!config || !config.accessToken) {
      return null;
    }

    var endpoint = config.endpoint || INSTAGRAM_ENDPOINT;
    if (endpoint.indexOf('access_token=') !== -1) {
      return endpoint;
    }

    var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
    return endpoint + separator + 'access_token=' + encodeURIComponent(config.accessToken);
  }

  function requestInstagramItems() {
    var requestUrl = buildInstagramRequest(window.__instagramConfig);
    if (!requestUrl) {
      return Promise.resolve([]);
    }

    return fetch(requestUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to fetch Instagram media (' + response.status + ')');
        }

        return response.json();
      })
      .then(function (payload) {
        var entries = Array.isArray(payload && payload.data) ? payload.data : [];
        return entries
          .filter(function (item) {
            return item && (item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM' || item.media_type === 'VIDEO');
          })
          .slice(0, INSTAGRAM_LIMIT)
          .map(function (item, index) {
            var src = item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url;
            if (!src) {
              return null;
            }

            return {
              src: src,
              href: item.permalink || INSTAGRAM_FALLBACK_LINK,
              alt: truncateCaption(item.caption, index),
            };
          })
          .filter(function (item) {
            return Boolean(item);
          });
      })
      .catch(function (error) {
        console.warn('[instagram] Falling back to placeholder images', error);
        return [];
      });
  }

  function renderInstagramGrid(grid, media) {
    if (!grid) {
      return;
    }

    var items = (media && media.length ? media : INSTAGRAM_PLACEHOLDER_MEDIA).slice(0, INSTAGRAM_LIMIT);
    var fragment = document.createDocumentFragment();
    grid.innerHTML = '';

    items.forEach(function (item, index) {
      var src = item.src;
      if (!src) {
        return;
      }

      var listItem = document.createElement('li');
      listItem.className = 'footer-gallery__item';

      var link = document.createElement('a');
      link.className = 'footer-gallery__thumb';
      link.href = item.href || INSTAGRAM_FALLBACK_LINK;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', item.alt || 'Terreno Club Instagram photo ' + (index + 1));

      var image = document.createElement('img');
      image.className = 'footer-gallery__image';
      image.src = src;
      image.alt = item.alt || 'Terreno Club Instagram photo ' + (index + 1);
      image.loading = 'lazy';
      image.decoding = 'async';

      link.appendChild(image);
      listItem.appendChild(link);
      fragment.appendChild(listItem);
    });

    grid.appendChild(fragment);
    grid.removeAttribute('aria-busy');
  }

  function initFooterGallery() {
    var grids = document.querySelectorAll('[data-instagram-grid]');
    if (!grids.length) {
      return;
    }

    grids.forEach(function (grid) {
      grid.setAttribute('aria-busy', 'true');
    });

    requestInstagramItems()
      .then(function (items) {
        var galleryItems = items && items.length ? items : INSTAGRAM_PLACEHOLDER_MEDIA;
        grids.forEach(function (grid) {
          renderInstagramGrid(grid, galleryItems);
        });
      })
      .catch(function () {
        grids.forEach(function (grid) {
          renderInstagramGrid(grid, INSTAGRAM_PLACEHOLDER_MEDIA);
        });
      });
  }

  function ensureBookingWidget() {
    if (typeof window !== 'undefined') {
      window._hors = BOOKING_WIDGET_CONFIG.map(function (entry) {
        return entry.slice();
      });
    }

    if (document.getElementById(BOOKING_WIDGET_SCRIPT_ID) || bookingScriptRequested) {
      return;
    }

    bookingScriptRequested = true;
    var script = document.createElement('script');
    script.id = BOOKING_WIDGET_SCRIPT_ID;
    script.src = BOOKING_WIDGET_SCRIPT_SRC;

    var firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else if (document.head) {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }
  }

  function initBookingModal() {
    var modal = document.querySelector('[data-booking-modal]');
    var openers = document.querySelectorAll('[data-booking-open]');
    var dialog = modal ? modal.querySelector('[data-booking-dialog]') : null;
    var closeButtons = modal ? modal.querySelectorAll('[data-booking-close]') : null;
    var activeTrigger = null;

    if (!modal || !openers.length || !dialog) {
      return;
    }

    var closeModal = function () {
      modal.classList.remove('is-visible');
      modal.setAttribute('hidden', '');
      document.body.classList.remove('modal-open');

      if (activeTrigger && typeof activeTrigger.focus === 'function') {
        activeTrigger.focus();
      }
    };

    var openModal = function () {
      activeTrigger = document.activeElement;
      modal.removeAttribute('hidden');
      modal.classList.add('is-visible');
      document.body.classList.add('modal-open');
      ensureBookingWidget();

      if (typeof dialog.focus === 'function') {
        dialog.focus();
      }
    };

    openers.forEach(function (opener) {
      opener.addEventListener('click', function (event) {
        event.preventDefault();
        openModal();
      });
    });

    if (closeButtons && closeButtons.length) {
      closeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          closeModal();
        });
      });
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (event) {
      if ((event.key === 'Escape' || event.key === 'Esc') && modal.classList.contains('is-visible')) {
        closeModal();
      }
    });
  }

  onReady(function () {
    var hasPlaceholders = !!document.querySelector('[data-include]');

    var start = function () {
      initI18n().then(function () {
        initPageFeatures();
        initBookingModal();
        initFooterGallery();
      });
    };

    if (window.__partialsLoaded || !hasPlaceholders) {
      start();
      return;
    }

    document.addEventListener(
      PARTIAL_EVENT,
      function () {
        start();
      },
      { once: true }
    );
  });
})();
