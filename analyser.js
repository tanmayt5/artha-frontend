/* ═══════════════════════════════════════════════════════════
   ARTHA ANALYSER — Internal Equity Intelligence Engine
   Tier 1: Rule-based scoring  |  Tier 2: Sector templates
   No external API. Pure deterministic functions.
   ═══════════════════════════════════════════════════════════ */

(function(global){
  'use strict';

  // ─── DNA SCORING ENGINE ────────────────────────────────
  // Returns total score (0-100) and component breakdown
  function calcDNA(s){
    var c = { promoter:0, debt:0, returns:0, growth:0, valuation:0 };

    // Promoter conviction (max 25)
    if(s.prom >= 50) c.promoter += 10;
    if(s.prom >= 60) c.promoter += 8;
    if(s.promTrend === 'increasing') c.promoter += 7;
    else if(s.promTrend === 'stable') c.promoter += 3;

    // Debt trajectory (max 20)
    if(s.de <= 0.3) c.debt += 12;
    else if(s.de <= 1.0) c.debt += 6;
    else if(s.de <= 2.0) c.debt += 2;
    if(s.debtTrend === 'declining') c.debt += 8;
    else if(s.debtTrend === 'stable') c.debt += 3;

    // Return on capital (max 25)
    if(s.roce >= 30) c.returns += 25;
    else if(s.roce >= 20) c.returns += 18;
    else if(s.roce >= 15) c.returns += 10;
    else if(s.roce >= 10) c.returns += 4;

    // Growth quality (max 20)
    if(s.epsGrowth >= 40) c.growth += 12;
    else if(s.epsGrowth >= 20) c.growth += 7;
    else if(s.epsGrowth >= 10) c.growth += 3;
    if(s.revGrowth >= 30) c.growth += 8;
    else if(s.revGrowth >= 15) c.growth += 4;

    // Valuation sanity (max 10)
    if(s.pe > 0 && s.pe <= 15) c.valuation += 10;
    else if(s.pe <= 30) c.valuation += 6;
    else if(s.pe <= 50) c.valuation += 2;

    var total = c.promoter + c.debt + c.returns + c.growth + c.valuation;
    var grade = total >= 75 ? 'S' : total >= 55 ? 'A' : total >= 35 ? 'B' : 'C';

    return { total: total, grade: grade, components: c };
  }

  // ─── BULL CASE RULES ───────────────────────────────────
  function bullPoints(s){
    var pts = [];

    if(s.roce >= 25) pts.push('Exceptional ROCE of ' + s.roce + '% — well above the 20% institutional quality threshold');
    else if(s.roce >= 18) pts.push('Strong ROCE of ' + s.roce + '% indicates efficient capital deployment');

    if(s.de <= 0.1) pts.push('Effectively debt-free (D/E ' + s.de + ') — no interest burden, full pricing power');
    else if(s.de <= 0.5 && s.debtTrend === 'declining') pts.push('Low debt (D/E ' + s.de + ') with declining trajectory — balance sheet de-risking in progress');

    if(s.prom >= 65) pts.push('High promoter holding at ' + s.prom + '% — strong alignment with minority shareholders');
    if(s.promTrend === 'increasing') pts.push('Promoter buying signals insider confidence — typically a strong leading indicator');

    if(s.epsGrowth >= 40) pts.push('EPS growth of ' + s.epsGrowth + '% YoY — earnings compounding at exceptional rate');
    else if(s.epsGrowth >= 25) pts.push('Robust EPS growth of ' + s.epsGrowth + '% YoY supports re-rating thesis');

    if(s.revGrowth >= 30 && s.epsGrowth > s.revGrowth) pts.push('Operating leverage at work — earnings growing faster than revenue (' + s.epsGrowth + '% vs ' + s.revGrowth + '%)');

    if(s.pe > 0 && s.pe <= 12 && s.roce >= 15) pts.push('Trading at just ' + s.pe + 'x earnings despite ' + s.roce + '% ROCE — classic value gap');

    if(pts.length === 0) pts.push('Stock metrics suggest a wait-and-watch approach; await better entry or fundamental improvement');
    return pts.slice(0, 3);
  }

  // ─── BEAR / RISK RULES ─────────────────────────────────
  function bearPoints(s){
    var pts = [];

    if(s.pe > 50) pts.push('Rich valuation at ' + s.pe + 'x earnings prices in significant growth — execution risk is high');
    else if(s.pe > 35 && s.epsGrowth < 25) pts.push('PE of ' + s.pe + 'x demands EPS growth beyond current ' + s.epsGrowth + '% — re-rating risk');

    if(s.de > 1.5) pts.push('Elevated leverage (D/E ' + s.de + ') exposes earnings to rate cycle and refinancing risk');
    else if(s.de > 0.8 && s.debtTrend === 'increasing') pts.push('Rising debt trajectory needs monitoring against interest coverage');

    if(s.promTrend === 'declining') pts.push('Promoter selling is a yellow flag — verify reason before adding');
    else if(s.prom < 35) pts.push('Low promoter holding at ' + s.prom + '% — weaker insider alignment');

    if(s.roce < 12) pts.push('Sub-par ROCE of ' + s.roce + '% suggests structural margin issues or asset-heavy model');

    if(s.revGrowth < 10 && s.epsGrowth < 10) pts.push('Growth has stalled (Rev ' + s.revGrowth + '%, EPS ' + s.epsGrowth + '%) — wait for re-acceleration');

    if(s.pb > 8 && s.roce < 25) pts.push('PB of ' + s.pb + 'x is rich relative to ' + s.roce + '% ROCE — book value premium unjustified');

    if(pts.length === 0) pts.push('Always size position appropriately — even high-quality names can de-rate on macro or sector rotation');
    return pts.slice(0, 3);
  }

  // ─── VALUATION COMMENT ─────────────────────────────────
  function valuationComment(s){
    if(s.pe <= 0) return 'Loss-making — earnings multiple not meaningful';
    if(s.pe <= 12) return 'Deep value zone at ' + s.pe + 'x — verify earnings sustainability and not a value trap';
    if(s.pe <= 20) return 'Reasonable at ' + s.pe + 'x — fair price for the quality on display';
    if(s.pe <= 35) return 'Growth premium at ' + s.pe + 'x — justified if EPS growth holds above 20%';
    if(s.pe <= 60) return 'Rich at ' + s.pe + 'x — pricing in multi-year compounding; tight margin for error';
    return 'Extreme valuation at ' + s.pe + 'x — momentum-driven; fundamentals must catch up significantly';
  }

  // ─── SECTOR TEMPLATES (Tier 2) ─────────────────────────
  // Parameterised theses per sector. Slots filled from data.
  var SECTOR_TEMPLATES = {

    'Metals': function(s){
      var tone = s.roce >= 20 ? 'high-quality' : s.roce >= 12 ? 'cyclical-quality' : 'commodity-driven';
      return 'Integrated metals & alloys play with ' + tone + ' characteristics. ROCE of ' + s.roce + '% reflects ' + 
        (s.roce >= 20 ? 'captive raw material advantage and operational leverage.' : 'sensitivity to commodity cycle.') +
        ' Capital structure (D/E ' + s.de + ', ' + s.debtTrend + ') is ' +
        (s.de <= 0.5 ? 'a competitive moat in a capex-heavy sector.' : 'a key variable to track through the cycle.') +
        ' Promoter at ' + s.prom + '% (' + s.promTrend + ') ' +
        (s.prom >= 60 && s.promTrend !== 'declining' ? 'signals long-term commitment.' : 'warrants attention to capital allocation decisions.');
    },

    'Chemicals': function(s){
      return 'Specialty/agro chemicals positioning with ROCE of ' + s.roce + '% — ' +
        (s.roce >= 20 ? 'top-decile capital efficiency in the sector.' : 'in line with broad sector.') +
        ' Revenue growth of ' + s.revGrowth + '% reflects ' +
        (s.revGrowth >= 20 ? 'strong end-market demand and possible market share gains.' : 'steady demand environment.') +
        ' D/E at ' + s.de + ' (' + s.debtTrend + ') and ' + s.prom + '% promoter holding shape the risk-reward setup. ' +
        (s.pe <= 15 ? 'Valuation at ' + s.pe + 'x is attractive vs sector premium.' : 'Premium valuation reflects market confidence in the growth runway.');
    },

    'IT': function(s){
      return 'IT services / electronics manufacturing exposure with ' + s.roce + '% ROCE — ' +
        (s.roce >= 35 ? 'world-class capital efficiency.' : s.roce >= 20 ? 'healthy sector returns.' : 'below sector leaders.') +
        ' ' + (s.de <= 0.1 ? 'Debt-free balance sheet is the norm for this sector and well maintained here.' : 'D/E of ' + s.de + ' is unusual for IT — verify expansion rationale.') +
        ' Revenue growth at ' + s.revGrowth + '% ' +
        (s.revGrowth < 10 ? 'reflects current sector headwinds from AI/offshore rate pressure.' : 'indicates strong client demand and execution.') +
        ' Promoter at ' + s.prom + '% (' + s.promTrend + ') aligns long-term thinking.';
    },

    'Power': function(s){
      return 'Power infrastructure / T&D play benefiting from India\'s grid modernisation cycle. ROCE of ' + s.roce + '% ' +
        (s.roce >= 20 ? 'demonstrates strong project execution and asset turnover.' : 'reflects the capital-intensive nature of power assets.') +
        ' D/E at ' + s.de + ' (' + s.debtTrend + ') ' +
        (s.de <= 0.3 ? 'is exceptional for the sector — significant competitive advantage.' : 'is typical for the sector; debt servicing capacity is the key metric.') +
        ' Revenue growth of ' + s.revGrowth + '% ' +
        (s.revGrowth >= 25 ? 'mirrors the national capex cycle acceleration.' : 'tracks orderbook execution.');
    },

    'Renewables': function(s){
      return 'Renewable energy exposure (solar/wind/storage) — riding India\'s 500GW renewables target. EPS growth of ' + s.epsGrowth + '% ' +
        (s.epsGrowth >= 50 ? 'is in hypergrowth territory; verify margin sustainability.' : 'reflects strong order conversion.') +
        ' Revenue growth at ' + s.revGrowth + '% indicates ' +
        (s.revGrowth >= 40 ? 'capacity ramp and demand absorption working in tandem.' : 'steady commercial scaling.') +
        ' ' + (s.de >= 1.0 ? 'Debt at D/E ' + s.de + ' is high but typical for capex phase; track productivity of incremental capital.' : 'D/E ' + s.de + ' is conservative for a growth-phase company.') +
        ' Valuation at ' + s.pe + 'x prices in significant continued execution.';
    },

    'Finance': function(s){
      return 'Financial services franchise with ROE/ROCE of ' + s.roce + '% ' +
        (s.roce >= 15 ? 'reflecting healthy spreads and asset quality.' : 'below sector leaders — examine NIM and credit cost trajectory.') +
        ' Loan/asset growth at ' + s.revGrowth + '% ' +
        (s.revGrowth >= 15 ? 'outpaces system growth — market share gains underway.' : 'tracks system credit growth.') +
        ' Note: D/E is structurally high for financials (here ' + s.de + ') and not directly comparable to non-financials. Promoter at ' + s.prom + '% ' +
        (s.prom === 0 ? 'is institutionally widely-held (common for top-tier private banks).' : 'reflects promoter-driven entity dynamics.');
    },

    'FMCG': function(s){
      return 'Consumer-facing franchise with ' + s.roce + '% ROCE — ' +
        (s.roce >= 25 ? 'strong brand equity and pricing power.' : 'reflects either growth investment phase or commodity input pressure.') +
        ' Revenue growth at ' + s.revGrowth + '% ' +
        (s.revGrowth >= 20 ? 'indicates strong consumer traction; likely market share gains.' : 'reflects steady consumption demand.') +
        ' D/E at ' + s.de + ' is ' +
        (s.de <= 0.5 ? 'comfortable for the cash-generative nature of consumer businesses.' : 'elevated for FMCG — verify expansion/working capital rationale.') +
        ' At ' + s.pe + 'x, valuation ' +
        (s.pe >= 40 ? 'demands sustained premium growth.' : 'is in reasonable consumer staple range.');
    },

    'Infrastructure': function(s){
      return 'Infrastructure execution play benefiting from India\'s ₹100L Cr+ capex pipeline through 2030. ROCE of ' + s.roce + '% ' +
        (s.roce >= 18 ? 'is exceptional for the sector and points to disciplined project selection.' : 'is typical for capital-intensive infra.') +
        ' Order book visibility and execution discipline matter more than P&L snapshots — promoter at ' + s.prom + '% (' + s.promTrend + ') ' +
        (s.promTrend !== 'declining' ? 'aligns long-term thinking.' : 'warrants extra scrutiny in this sector.') +
        ' D/E of ' + s.de + ' (' + s.debtTrend + ') ' +
        (s.de <= 0.5 ? 'is below sector norm — a quality signal.' : 'is in line with project finance norms.');
    },

    'Energy': function(s){
      return 'Energy / conglomerate exposure with ROCE of ' + s.roce + '%. ' +
        (s.roce < 15 ? 'Sub-15% ROCE reflects asset-heavy nature; conglomerate parts may individually be much higher quality.' : 'Healthy returns for capital intensity.') +
        ' SOTP analysis often more meaningful than headline multiples for conglomerates. ' +
        'Revenue growth of ' + s.revGrowth + '% blends cash-cow segments with optionality-led new businesses. ' +
        (s.de <= 0.6 ? 'Balance sheet at D/E ' + s.de + ' supports capex flexibility.' : 'D/E ' + s.de + ' reflects ongoing transformation investments.');
    },

    'Manufacturing': function(s){
      return 'Manufacturing / capital goods exposure to India\'s industrial capex cycle. ROCE of ' + s.roce + '% ' +
        (s.roce >= 25 ? 'is top-decile for the sector — operational excellence on display.' : 'reflects scale economics and operational discipline.') +
        ' Promoter at ' + s.prom + '% (' + s.promTrend + ') ' +
        (s.prom >= 60 ? 'shows high conviction; promoter-led capital allocation matters most in this segment.' : 'is moderate — track strategic decisions closely.') +
        ' D/E of ' + s.de + ' ' +
        (s.de <= 0.3 ? 'is exceptional — manufacturing without leverage is a quality marker.' : 'is in line with sector norms.') +
        ' At ' + s.pe + 'x, valuation ' + (s.pe >= 40 ? 'prices in confidence in capex super-cycle.' : 'looks reasonable on sector multiples.');
    }
  };

  // Default fallback for any uncovered sector
  function defaultTemplate(s){
    return 'Generic equity profile with ' + s.roce + '% ROCE, D/E of ' + s.de + ', and ' + s.prom + '% promoter holding. ' +
      'Revenue growth at ' + s.revGrowth + '% and EPS growth at ' + s.epsGrowth + '%. ' +
      'Valuation of ' + s.pe + 'x earnings ' + (s.pe <= 20 ? 'looks reasonable.' : 'reflects market premium.') +
      ' Standard due diligence applies — verify quarterly trends and management commentary.';
  }

  // ─── MAIN ANALYSE FUNCTION ─────────────────────────────
  function analyse(s){
    var dna = calcDNA(s);
    var tmpl = SECTOR_TEMPLATES[s.sector] || defaultTemplate;
    var thesis = tmpl(s);
    var bull = bullPoints(s);
    var bear = bearPoints(s);
    var val = valuationComment(s);

    return {
      dnaScore: dna.total,
      grade: dna.grade,
      components: dna.components,
      thesis: thesis,
      bullPoints: bull,
      bearPoints: bear,
      valuationComment: val,
      sector: s.sector,
      // Standard summary one-liner
      summary: bull[0] + ' Key risk: ' + bear[0].toLowerCase() + (bear[0].endsWith('.') ? '' : '.')
    };
  }

  // ─── EXPORT ────────────────────────────────────────────
  global.ArthaAnalyser = {
    analyse: analyse,
    calcDNA: calcDNA,
    bullPoints: bullPoints,
    bearPoints: bearPoints,
    valuationComment: valuationComment,
    version: '1.0.0'
  };

})(typeof window !== 'undefined' ? window : this);
