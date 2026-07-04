/**
 * ARTHA — Privacy Blur Mode (shared component)
 * ============================================
 *
 * Global one-tap toggle to blur every rupee amount on screen.
 * Useful for: showing the product to a friend, sitting in a café,
 * screen-sharing on calls, or just preferring discretion by default.
 *
 * On every page that includes this script:
 *   - A small "🙈 ₹" toggle button appears bottom-left (fixed)
 *   - Click to blur all currency amounts; click again to reveal
 *   - State persists in localStorage across sessions and pages
 *   - Auto-detects new amounts when DOM updates (e.g. portfolio loads,
 *     watchlist fills) via MutationObserver
 *
 * Detection logic:
 *   - Text nodes containing the ₹ symbol get marked
 *   - Optionally, elements with class `artha-amount` are also marked
 *     (for cases where a number is rendered without the ₹ prefix)
 *   - Page header titles / nav remain readable; only the numeric values
 *     get blurred so the page structure stays navigable
 *
 * To include on any Artha page, before </body>:
 *   <script src="artha-blur-mode.js"></script>
 *
 * Safe to double-include (guards itself). No host-page edits required.
 */

(function() {
  if (window.__arthaBlurModeInitialized) return;
  window.__arthaBlurModeInitialized = true;

  // ──────────────────────────────────────────────────────────────
  // STORAGE
  // ──────────────────────────────────────────────────────────────
  var STORAGE_KEY = 'artha_blur_mode_v1';
  function isBlurred() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }
  function setBlurred(v) {
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); }
    catch (e) { /* quota — ignore */ }
  }

  // ──────────────────────────────────────────────────────────────
  // STYLES
  // ──────────────────────────────────────────────────────────────
  var css = `
    /* Marked amounts in normal mode: pass-through */
    .artha-amount-node { transition: filter 0.18s ease, color 0.18s ease; }

    /* When body has the .artha-blur class, blur all marked amounts */
    body.artha-blur .artha-amount-node {
      filter: blur(7px);
      user-select: none;
      cursor: not-allowed;
    }
    body.artha-blur .artha-amount-node::selection { background: transparent; }

    /* The toggle button (bottom-left, mirror of AI drawer's bottom-right) */
    .artha-blur-fab {
      position: fixed; bottom: 24px; left: 24px; z-index: 9997;
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(10, 30, 19, 0.85);
      border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(20px);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.62rem; letter-spacing: 0.4px;
      color: rgba(255,255,255,0.7);
      transition: all 0.18s ease;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .artha-blur-fab:hover {
      color: #D4A843; border-color: rgba(201,149,46,0.4);
      background: rgba(10, 30, 19, 0.92);
    }
    body.artha-blur .artha-blur-fab {
      color: #D4A843; border-color: rgba(201,149,46,0.45);
      background: rgba(201,149,46,0.08);
    }
    .artha-blur-fab .blur-icon { font-size: 1rem; line-height: 1; }
    .artha-blur-fab .blur-label {
      position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
      margin-bottom: 0.5rem; white-space: nowrap;
      background: rgba(10, 30, 19, 0.95); color: rgba(255,255,255,0.9);
      font-size: 0.62rem; letter-spacing: 0.4px;
      padding: 0.32rem 0.65rem; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      opacity: 0; pointer-events: none;
      transition: opacity 0.18s ease;
    }
    .artha-blur-fab:hover .blur-label { opacity: 1; }

    @media(max-width: 540px) {
      .artha-blur-fab { bottom: 18px; left: 18px; width: 40px; height: 40px; }
    }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ──────────────────────────────────────────────────────────────
  // DETECTION — find currency-bearing text nodes and elements
  // ──────────────────────────────────────────────────────────────
  // Two ways to mark a thing as a currency amount:
  //   1. Text contains ₹ (most common — we wrap the closest reasonable parent)
  //   2. Element has class `artha-amount` (explicit opt-in, useful when a
  //      number is rendered without the ₹ symbol — e.g. percentages, ratios)
  //
  // For text-node detection, we use a TreeWalker to scan the DOM, then mark
  // the nearest non-empty inline parent. This is cheaper than wrapping each
  // text node in a span (which would mutate the DOM heavily).

  // Tags whose entire content should be treated as one amount unit
  var INLINE_AMOUNT_TAGS = ['SPAN', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'CODE', 'DIV', 'TD', 'LI', 'P'];

  function shouldSkipNode(el) {
    if (!el || !el.tagName) return true;
    if (el.classList && el.classList.contains('artha-no-blur')) return true;
    var tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
    // Skip nav, footer headlines — keep the page chrome readable
    if (el.closest && el.closest('nav, footer, .aiad-drawer, .aiad-fab, .artha-blur-fab')) return true;
    return false;
  }

  function markAmountElements(root) {
    root = root || document.body;
    if (!root) return 0;

    var count = 0;

    // (1) Explicit `artha-amount` class
    root.querySelectorAll('.artha-amount').forEach(function(el) {
      if (!el.classList.contains('artha-amount-node')) {
        el.classList.add('artha-amount-node');
        count++;
      }
    });

    // (2) Text-node scan for ₹
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return count;

    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(textNode) {
          if (!textNode.nodeValue) return NodeFilter.FILTER_REJECT;
          if (textNode.nodeValue.indexOf('₹') === -1) return NodeFilter.FILTER_REJECT;
          var parent = textNode.parentElement;
          if (shouldSkipNode(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!parent) continue;

      // Walk up to find the cleanest "amount-containing" wrapper
      // — usually the closest inline-ish parent that contains JUST this amount
      var target = parent;
      // If the parent is very large (e.g. <p>) and the ₹ text is short relative
      // to its full text, wrap the text node itself to avoid blurring whole paragraphs
      var parentText = (parent.textContent || '').trim();
      var ourText = (node.nodeValue || '').trim();

      if (parentText.length > ourText.length * 2 && INLINE_AMOUNT_TAGS.indexOf(parent.tagName) === -1) {
        // Wrap just the text node in a span
        var span = document.createElement('span');
        span.className = 'artha-amount-node';
        var newNode = node.cloneNode(false);
        span.appendChild(newNode);
        parent.replaceChild(span, node);
        count++;
      } else {
        // Mark the parent
        if (!target.classList.contains('artha-amount-node')) {
          target.classList.add('artha-amount-node');
          count++;
        }
      }
    }

    return count;
  }

  // ──────────────────────────────────────────────────────────────
  // TOGGLE
  // ──────────────────────────────────────────────────────────────
  function applyState() {
    var on = isBlurred();
    document.body.classList.toggle('artha-blur', on);
    var fab = document.getElementById('artha-blur-fab');
    if (fab) {
      var icon = fab.querySelector('.blur-icon');
      var label = fab.querySelector('.blur-label');
      if (icon) icon.textContent = on ? '👁' : '🙈';
      if (label) label.textContent = on ? 'Show amounts' : 'Hide amounts';
      fab.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function toggle() {
    var newState = !isBlurred();
    setBlurred(newState);
    // Make sure we've marked all current amounts before applying
    markAmountElements(document.body);
    applyState();
  }

  // ──────────────────────────────────────────────────────────────
  // FAB
  // ──────────────────────────────────────────────────────────────
  var fab = document.createElement('button');
  fab.id = 'artha-blur-fab';
  fab.className = 'artha-blur-fab artha-no-blur';
  fab.setAttribute('aria-label', 'Toggle privacy blur');
  fab.setAttribute('aria-pressed', 'false');
  fab.innerHTML = '<span class="blur-icon">🙈</span><span class="blur-label">Hide amounts</span>';
  fab.onclick = toggle;

  // ──────────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────────
  function init() {
    document.body.appendChild(fab);
    markAmountElements(document.body);
    applyState();

    // Re-scan when the DOM changes (portfolio load, watchlist fill, tab switch, etc.)
    // Debounced — heavy pages may have many small mutations.
    var rescanTimer = null;
    var observer = new MutationObserver(function() {
      if (rescanTimer) return;
      rescanTimer = setTimeout(function() {
        rescanTimer = null;
        markAmountElements(document.body);
        if (isBlurred()) applyState();
      }, 180);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
