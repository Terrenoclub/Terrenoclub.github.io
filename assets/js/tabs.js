const ACCORDION_QUERY = '(max-width: 600px)';
const TRANSITION_FALLBACK_MS = 400;

class TabsController {
  constructor(root) {
    this.root = root;
    this.tablist = root.querySelector('[role="tablist"]');
    if (!this.tablist) {
      return;
    }

    const tabElements = Array.from(this.tablist.querySelectorAll('[role="tab"]'));
    this.items = tabElements
      .map((tab, index) => {
        const panelId = tab.getAttribute('aria-controls');
        if (!panelId) {
          return null;
        }

        let panel = null;
        try {
          const selector = `#${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(panelId) : panelId}`;
          panel = this.root.querySelector(selector);
        } catch (error) {
          panel = this.root.querySelector(`#${panelId}`);
        }

        if (!panel) {
          return null;
        }

        const container = tab.closest('[data-tab-item]') || tab.parentElement;
        const placeholder = document.createComment('tab-panel-placeholder');
        panel.after(placeholder);

        return {
          tab,
          panel,
          container,
          placeholder,
          index,
          hideTimeout: null,
          onTransitionEnd: null,
        };
      })
      .filter(Boolean);

    if (!this.items.length) {
      return;
    }

    this.activeIndex = this.items.findIndex((item) => item.tab.getAttribute('aria-selected') === 'true');
    if (this.activeIndex < 0) {
      this.activeIndex = 0;
    }

    this.isAccordion = false;

    this.items.forEach((item, index) => {
      item.tab.addEventListener('click', (event) => {
        event.preventDefault();
        this.activate(index, { setFocus: false });
      });

      item.tab.addEventListener('keydown', (event) => {
        this.onKeydown(event, index);
      });
    });

    this.activate(this.activeIndex, { setFocus: false, force: true });

    if (typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia(ACCORDION_QUERY);
      const handleChange = (event) => {
        this.updateLayout(event.matches);
      };

      if (typeof this.mediaQuery.addEventListener === 'function') {
        this.mediaQuery.addEventListener('change', handleChange);
      } else if (typeof this.mediaQuery.addListener === 'function') {
        this.mediaQuery.addListener(handleChange);
      }

      this.updateLayout(this.mediaQuery.matches);
    } else {
      this.mediaQuery = null;
      this.updateLayout(false);
    }
  }

  onKeydown(event, index) {
    const key = event.key;
    const isActivationKey = key === 'Enter' || key === ' ' || key === 'Spacebar';
    const previousKeys = ['ArrowLeft', 'ArrowUp'];
    const nextKeys = ['ArrowRight', 'ArrowDown'];

    if (previousKeys.includes(key)) {
      event.preventDefault();
      this.moveFocus(index, -1);
      return;
    }

    if (nextKeys.includes(key)) {
      event.preventDefault();
      this.moveFocus(index, 1);
      return;
    }

    if (key === 'Home') {
      event.preventDefault();
      this.activate(0, { setFocus: true });
      return;
    }

    if (key === 'End') {
      event.preventDefault();
      this.activate(this.items.length - 1, { setFocus: true });
      return;
    }

    if (isActivationKey) {
      event.preventDefault();
      this.activate(index, { setFocus: false });
    }
  }

  moveFocus(currentIndex, delta) {
    const total = this.items.length;
    const nextIndex = (currentIndex + delta + total) % total;
    this.activate(nextIndex, { setFocus: true });
  }

  activate(index, { setFocus = false, force = false } = {}) {
    if (!force && this.activeIndex === index) {
      if (setFocus) {
        this.items[index].tab.focus();
      }
      return;
    }

    this.activeIndex = index;

    this.items.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;

      item.tab.setAttribute('aria-selected', String(isActive));
      item.tab.setAttribute('tabindex', isActive ? '0' : '-1');
      item.tab.classList.toggle('is-active', isActive);

      if (force) {
        item.panel.hidden = !isActive;
        item.panel.classList.toggle('is-active', isActive);
        item.panel.classList.toggle('is-visible', isActive);
      } else if (isActive) {
        this.showPanel(item);
      } else {
        this.hidePanel(item);
      }
    });

    this.updateAriaExpanded();

    if (setFocus) {
      this.items[index].tab.focus();
    }
  }

  showPanel(item) {
    if (item.hideTimeout) {
      window.clearTimeout(item.hideTimeout);
      item.hideTimeout = null;
    }

    if (item.onTransitionEnd) {
      item.panel.removeEventListener('transitionend', item.onTransitionEnd);
      item.onTransitionEnd = null;
    }

    item.panel.hidden = false;
    item.panel.classList.add('is-active');

    requestAnimationFrame(() => {
      item.panel.classList.add('is-visible');
    });
  }

  hidePanel(item) {
    if (item.hideTimeout) {
      window.clearTimeout(item.hideTimeout);
      item.hideTimeout = null;
    }

    if (item.onTransitionEnd) {
      item.panel.removeEventListener('transitionend', item.onTransitionEnd);
      item.onTransitionEnd = null;
    }

    if (item.panel.hidden) {
      item.panel.classList.remove('is-active', 'is-visible');
      return;
    }

    item.panel.classList.remove('is-visible');

    const cleanup = () => {
      if (item.hideTimeout) {
        window.clearTimeout(item.hideTimeout);
        item.hideTimeout = null;
      }

      if (item.onTransitionEnd) {
        item.panel.removeEventListener('transitionend', item.onTransitionEnd);
        item.onTransitionEnd = null;
      }

      item.panel.hidden = true;
      item.panel.classList.remove('is-active');
    };

    item.hideTimeout = window.setTimeout(cleanup, TRANSITION_FALLBACK_MS);

    item.onTransitionEnd = (event) => {
      if (event.target !== item.panel || event.propertyName !== 'opacity') {
        return;
      }

      cleanup();
    };

    item.panel.addEventListener('transitionend', item.onTransitionEnd);
  }

  updateAriaExpanded() {
    this.items.forEach((item, index) => {
      const expanded = index === this.activeIndex;
      item.tab.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  updateLayout(isAccordion) {
    this.isAccordion = isAccordion;
    this.root.classList.toggle('is-accordion', this.isAccordion);
    this.tablist.setAttribute('aria-orientation', this.isAccordion ? 'vertical' : 'horizontal');

    this.items.forEach((item) => {
      if (this.isAccordion) {
        if (item.panel.parentElement !== item.container) {
          item.container.appendChild(item.panel);
        }
        item.container.classList.add('tabs-accordion-item');
      } else {
        const parent = item.placeholder.parentNode;
        if (parent) {
          parent.insertBefore(item.panel, item.placeholder);
        }
        item.container.classList.remove('tabs-accordion-item');
      }
    });

    this.updateAriaExpanded();
  }
}

function initTabs() {
  const roots = document.querySelectorAll('[data-tabs]');
  roots.forEach((root) => {
    new TabsController(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTabs, { once: true });
} else {
  initTabs();
}
