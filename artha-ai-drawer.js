/**
 * ARTHA — AI Assistant Drawer (shared component)
 * ==============================================
 *
 * Self-contained slide-out drawer that lives on the right edge of every
 * product page. Click the floating button (bottom-right) to open.
 *
 * Current state: PLACEHOLDER UI.
 *   - The chat input accepts messages and shows them in the thread
 *   - Replies are canned (informational) since the real engine is the
 *     Day 21 `artha_research_engine.py` which hasn't landed yet
 *   - When the engine arrives, swap `_stubReply()` for a fetch to
 *     /api/analysis/chat (a future endpoint)
 *
 * Why a placeholder now: locking in the UI surface, the open/close
 * pattern, and where the button lives across all 5 pages BEFORE the
 * engine ships. Means zero design work when the engine arrives — just
 * a function swap.
 *
 * To include on any Artha page, add to the bottom of <body>:
 *   <script src="artha-ai-drawer.js"></script>
 *
 * No HTML or CSS edits needed on the host page — the drawer injects
 * its own styles and DOM. It only runs if it doesn't detect itself
 * already (so double-includes are safe).
 *
 * Visibility: shows a small "AI" button bottom-right on all pages.
 * Click → slide-out drawer from right. Esc or click outside to close.
 */

(function() {
  // Don't double-inject
  if (window.__arthaAIDrawerInitialized) return;
  window.__arthaAIDrawerInitialized = true;

  // ──────────────────────────────────────────────────────────────
  // STYLES — injected once
  // ──────────────────────────────────────────────────────────────
  var css = `
    .aiad-fab{position:fixed;bottom:24px;right:24px;z-index:9998;
      width:54px;height:54px;border-radius:50%;
      background:linear-gradient(135deg,#D4A843,#C9952E);
      border:1px solid rgba(201,149,46,0.45);
      box-shadow:0 8px 28px rgba(201,149,46,0.28), 0 2px 8px rgba(0,0,0,0.3);
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:transform 0.18s, box-shadow 0.2s;
      font-family:'Cormorant Garamond',Georgia,serif;
      font-size:1.45rem;font-weight:600;color:#0A1E13;
      font-style:italic;letter-spacing:-0.5px;}
    .aiad-fab:hover{transform:translateY(-2px) scale(1.04);
      box-shadow:0 10px 32px rgba(201,149,46,0.38), 0 2px 8px rgba(0,0,0,0.3);}
    .aiad-fab.hidden{display:none;}
    .aiad-fab-pulse{position:absolute;width:54px;height:54px;border-radius:50%;
      background:rgba(201,149,46,0.4);animation:aiad-pulse 2.5s ease-out infinite;
      pointer-events:none;z-index:-1;}
    @keyframes aiad-pulse{0%{transform:scale(1);opacity:0.55;}80%,100%{transform:scale(1.7);opacity:0;}}

    .aiad-overlay{position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);
      opacity:0;pointer-events:none;transition:opacity 0.3s;}
    .aiad-overlay.open{opacity:1;pointer-events:auto;}

    .aiad-drawer{position:fixed;top:0;right:0;height:100vh;width:420px;max-width:90vw;
      z-index:10000;background:rgba(10,30,19,0.92);backdrop-filter:blur(24px);
      border-left:1px solid rgba(255,255,255,0.08);
      transform:translateX(100%);transition:transform 0.32s cubic-bezier(0.23,1,0.32,1);
      display:flex;flex-direction:column;
      font-family:'Inter',system-ui,sans-serif;color:rgba(255,255,255,0.93);}
    .aiad-drawer.open{transform:translateX(0);}

    .aiad-head{padding:1.1rem 1.4rem 1rem;border-bottom:1px solid rgba(255,255,255,0.07);
      display:flex;align-items:center;justify-content:space-between;gap:0.8rem;}
    .aiad-head-l{display:flex;align-items:center;gap:0.7rem;flex:1;min-width:0;}
    .aiad-head-icon{width:36px;height:36px;border-radius:50%;
      background:linear-gradient(135deg,rgba(201,149,46,0.22),rgba(201,149,46,0.06));
      border:1px solid rgba(201,149,46,0.32);
      display:flex;align-items:center;justify-content:center;
      font-family:'Cormorant Garamond',Georgia,serif;font-size:1.1rem;color:#D4A843;
      font-weight:600;font-style:italic;}
    .aiad-head-title{font-family:'Cormorant Garamond',Georgia,serif;
      font-size:1.25rem;font-weight:600;line-height:1.2;}
    .aiad-head-title em{color:#C9952E;font-style:italic;}
    .aiad-head-sub{font-family:'JetBrains Mono',monospace;font-size:0.58rem;
      letter-spacing:1.2px;color:rgba(255,255,255,0.45);
      text-transform:uppercase;margin-top:0.15rem;}
    .aiad-close{background:transparent;border:none;color:rgba(255,255,255,0.5);
      font-size:1.5rem;cursor:pointer;padding:0.2rem 0.5rem;line-height:1;
      transition:color 0.15s;border-radius:6px;}
    .aiad-close:hover{color:rgba(255,255,255,0.95);}

    .aiad-body{flex:1;overflow-y:auto;padding:1.1rem 1.4rem;
      display:flex;flex-direction:column;gap:0.85rem;}
    .aiad-body::-webkit-scrollbar{width:4px;}
    .aiad-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}

    .aiad-msg{padding:0.85rem 1rem;border-radius:11px;line-height:1.65;font-size:0.85rem;
      max-width:88%;}
    .aiad-msg.assistant{background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.93);
      align-self:flex-start;}
    .aiad-msg.user{background:rgba(201,149,46,0.08);
      border:1px solid rgba(201,149,46,0.22);color:rgba(255,255,255,0.95);
      align-self:flex-end;}
    .aiad-msg.system{background:rgba(96,165,250,0.05);
      border:1px solid rgba(96,165,250,0.2);color:rgba(96,165,250,0.95);
      font-size:0.78rem;align-self:flex-start;}

    .aiad-msg-meta{font-family:'JetBrains Mono',monospace;font-size:0.55rem;
      letter-spacing:1px;color:rgba(255,255,255,0.32);text-transform:uppercase;
      margin-bottom:0.35rem;}

    .aiad-quick-row{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.6rem;}
    .aiad-quick-chip{font-family:'JetBrains Mono',monospace;font-size:0.65rem;
      color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.08);padding:0.3rem 0.65rem;border-radius:100px;
      cursor:pointer;transition:all 0.15s;letter-spacing:0.3px;}
    .aiad-quick-chip:hover{color:#D4A843;border-color:rgba(201,149,46,0.3);}

    .aiad-foot{padding:0.85rem 1.4rem 1.1rem;border-top:1px solid rgba(255,255,255,0.07);}
    .aiad-input-wrap{display:flex;gap:0.5rem;align-items:stretch;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:11px;padding:0.4rem 0.55rem 0.4rem 0.9rem;
      transition:border-color 0.15s;}
    .aiad-input-wrap:focus-within{border-color:rgba(201,149,46,0.35);}
    .aiad-input{flex:1;background:transparent;border:none;color:rgba(255,255,255,0.93);
      font-family:'Inter',system-ui,sans-serif;font-size:0.85rem;outline:none;
      padding:0.4rem 0;}
    .aiad-input::placeholder{color:rgba(255,255,255,0.32);font-size:0.78rem;}
    .aiad-send{background:linear-gradient(135deg,#D4A843,#C9952E);color:#0A1E13;
      border:none;border-radius:8px;padding:0 0.95rem;font-size:0.74rem;font-weight:600;
      cursor:pointer;font-family:'Inter',system-ui,sans-serif;transition:transform 0.15s;}
    .aiad-send:hover:not(:disabled){transform:translateY(-1px);}
    .aiad-send:disabled{opacity:0.4;cursor:not-allowed;}
    .aiad-foot-note{font-family:'JetBrains Mono',monospace;font-size:0.55rem;
      letter-spacing:0.8px;color:rgba(255,255,255,0.3);text-align:center;
      margin-top:0.6rem;text-transform:uppercase;}

    .aiad-typing{display:flex;gap:0.3rem;align-items:center;padding:0.85rem 1rem;}
    .aiad-typing span{width:5px;height:5px;border-radius:50%;background:#C9952E;
      animation:aiad-bounce 1.2s ease-in-out infinite;}
    .aiad-typing span:nth-child(2){animation-delay:0.15s;}
    .aiad-typing span:nth-child(3){animation-delay:0.3s;}
    @keyframes aiad-bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4;}40%{transform:scale(1);opacity:1;}}

    @media(max-width:540px){
      .aiad-drawer{width:100vw;max-width:100vw;}
      .aiad-fab{bottom:18px;right:18px;width:48px;height:48px;font-size:1.25rem;}
      .aiad-fab-pulse{width:48px;height:48px;}
    }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ──────────────────────────────────────────────────────────────
  // DOM
  // ──────────────────────────────────────────────────────────────
  var fabHTML = '<div class="aiad-fab-pulse"></div>A';
  var fab = document.createElement('button');
  fab.className = 'aiad-fab';
  fab.setAttribute('aria-label', 'Open Artha AI assistant');
  fab.innerHTML = fabHTML;
  fab.onclick = openDrawer;

  var overlay = document.createElement('div');
  overlay.className = 'aiad-overlay';
  overlay.onclick = closeDrawer;

  var drawer = document.createElement('aside');
  drawer.className = 'aiad-drawer';
  drawer.setAttribute('aria-label', 'Artha AI assistant');
  drawer.innerHTML =
    '<div class="aiad-head">' +
      '<div class="aiad-head-l">' +
        '<div class="aiad-head-icon">A</div>' +
        '<div>' +
          '<div class="aiad-head-title">Artha <em>AI</em></div>' +
          '<div class="aiad-head-sub">Premium feature · preview</div>' +
        '</div>' +
      '</div>' +
      '<button class="aiad-close" aria-label="Close">×</button>' +
    '</div>' +
    '<div class="aiad-body" id="aiad-body"></div>' +
    '<div class="aiad-foot">' +
      '<div class="aiad-quick-row" id="aiad-quick-row">' +
        '<div class="aiad-quick-chip" data-prompt="What does fund overlap mean?">What does overlap mean?</div>' +
        '<div class="aiad-quick-chip" data-prompt="Explain the 7 fund quality dimensions">7 fund dimensions</div>' +
        '<div class="aiad-quick-chip" data-prompt="How does the tax simulator work?">Tax simulator</div>' +
      '</div>' +
      '<div class="aiad-input-wrap">' +
        '<input class="aiad-input" id="aiad-input" type="text" placeholder="Ask about anything on this page…" maxlength="500"/>' +
        '<button class="aiad-send" id="aiad-send">Send →</button>' +
      '</div>' +
      '<div class="aiad-foot-note">Replies are informational · Premium AI co-pilot launching soon</div>' +
    '</div>';

  document.body.appendChild(fab);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // ──────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────
  var DRAWER_STORAGE_KEY = 'artha_ai_drawer_v1';
  var thread = [];
  var seeded = false;

  function loadThread() {
    try {
      var raw = sessionStorage.getItem(DRAWER_STORAGE_KEY);
      if (raw) thread = JSON.parse(raw) || [];
    } catch (e) {
      thread = [];
    }
  }

  function saveThread() {
    try {
      sessionStorage.setItem(DRAWER_STORAGE_KEY, JSON.stringify(thread));
    } catch (e) { /* quota — ignore */ }
  }

  function seedGreeting() {
    if (seeded) return;
    seeded = true;
    if (thread.length === 0) {
      pushAssistant(
        "Hi — I'm Artha's AI co-pilot. I can help explain what's on screen, walk through fund overlap math, " +
        "decode tax scenarios, or answer general questions about your portfolio.\n\n" +
        "I'm in preview mode right now — full replies come with the Premium tier. " +
        "Try one of the quick prompts below, or ask me anything."
      );
    }
    renderThread();
  }

  // ──────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ──────────────────────────────────────────────────────────────
  function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    fab.classList.add('hidden');
    loadThread();
    seedGreeting();
    setTimeout(function() { document.getElementById('aiad-input').focus(); }, 280);
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    setTimeout(function() { fab.classList.remove('hidden'); }, 280);
  }

  drawer.querySelector('.aiad-close').onclick = closeDrawer;
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });

  // ──────────────────────────────────────────────────────────────
  // MESSAGES
  // ──────────────────────────────────────────────────────────────
  function pushUser(text) { thread.push({ role: 'user', text: text, ts: Date.now() }); saveThread(); }
  function pushAssistant(text) { thread.push({ role: 'assistant', text: text, ts: Date.now() }); saveThread(); }

  function renderThread() {
    var body = document.getElementById('aiad-body');
    body.innerHTML = '';
    thread.forEach(function(msg) {
      var div = document.createElement('div');
      div.className = 'aiad-msg ' + msg.role;
      div.textContent = msg.text;
      body.appendChild(div);
    });
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    var body = document.getElementById('aiad-body');
    var t = document.createElement('div');
    t.className = 'aiad-msg assistant aiad-typing';
    t.id = 'aiad-typing-indicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById('aiad-typing-indicator');
    if (t) t.remove();
  }

  // ──────────────────────────────────────────────────────────────
  // SEND
  // ──────────────────────────────────────────────────────────────
  // PLACEHOLDER REPLY LOGIC
  // When the real engine ships, replace _stubReply with a fetch to
  // /api/analysis/chat passing {message, page_context} and stream
  // back tokens. The UI plumbing above is already correct.
  function _stubReply(userText) {
    var t = userText.toLowerCase();
    if (/overlap|hhi|concentration/.test(t)) {
      return "MF overlap is the percentage of stocks two funds share. Artha computes pairwise overlap across every pair in your CAS, then surfaces the Herfindahl-inverse effective stock count — the truer measure of how diversified you actually are. Six funds with 60% overlap = roughly 14 effective stocks, not 60. See the Portfolio page for the matrix.";
    }
    if (/fund.{0,15}quality|7 dim|score|dimension/.test(t)) {
      return "Each fund is scored across 7 dimensions: expense efficiency (TER vs category median), risk-adjusted return (Sharpe-style), drawdown discipline (max drawdown vs category), concentration fitness (effective stocks), fund size health (AUM in healthy band), manager stability (tenure), and track record length. No composite star rating — you see component scores so you can decide what matters. Each pill shows the raw value and confidence level.";
    }
    if (/tax|harvest|ltcg|stcg|idcw/.test(t)) {
      return "The tax simulator runs three scenarios on FY 2025-26 rates: LTCG harvest (book gains within the ₹1.25L exemption), sell-now vs wait (compare tax impact of holding period), and old vs new regime. We use the CAS snapshot for approximate gains — actual harvestable amount depends on per-position holding period and prior FY realisations. Always verify with a CA before acting.";
    }
    if (/buy|sell|target price|recommend|should i/.test(t)) {
      return "Artha doesn't give buy/sell recommendations — only POSITIVE / NEUTRAL / CAUTIOUS framing on the analysis page, with the math behind it. We don't use target prices either. Run the analysis pipeline on the AI Analysis tab to see the four-agent breakdown for any ticker, then form your own view.";
    }
    if (/cas|upload|portfolio/.test(t)) {
      return "Upload a CAMS or KFin CAS PDF on the Portfolio page. We parse it locally (the PDF never leaves your session), then compute MF overlap, 7-dimension fund quality scores, and tax intelligence on top of it. Takes about 90 seconds end-to-end.";
    }
    return "I'm in preview mode and don't have a tailored answer for that yet — the full Artha AI co-pilot launches with Premium (₹299/mo). For now: try the quick prompts below, or explore the four-agent analysis on the AI Analysis tab — that's where the real pipeline lives.";
  }

  function handleSend() {
    var input = document.getElementById('aiad-input');
    var text = (input.value || '').trim();
    if (!text) return;

    pushUser(text);
    renderThread();
    input.value = '';
    document.getElementById('aiad-send').disabled = true;

    showTyping();
    setTimeout(function() {
      hideTyping();
      pushAssistant(_stubReply(text));
      renderThread();
      document.getElementById('aiad-send').disabled = false;
    }, 700 + Math.random() * 600);
  }

  document.getElementById('aiad-send').onclick = handleSend;
  document.getElementById('aiad-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  drawer.querySelectorAll('.aiad-quick-chip').forEach(function(chip) {
    chip.onclick = function() {
      document.getElementById('aiad-input').value = chip.getAttribute('data-prompt');
      handleSend();
    };
  });
})();
