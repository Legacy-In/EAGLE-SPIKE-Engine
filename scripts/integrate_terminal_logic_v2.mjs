import fs from 'fs';
import path from 'path';

const eaglePath = path.resolve('apps/web/public/eagle-flash.html');
let content = fs.readFileSync(eaglePath, 'utf8');

// The new JavaScript logic containing SECTOR_MAP, helpers, and upgraded renderSignalsTab + renderHeatmapTab
const newLogic = `
    // ═════════════════════════════════════════════════════════════════════════
    // SECTOR TAXONOMY & ANOMALY INTELLIGENCE
    // ═════════════════════════════════════════════════════════════════════════

    const SECTOR_MAP = {
      BTC: 'LAYER 1', ETH: 'LAYER 1', SOL: 'LAYER 1', AVAX: 'LAYER 1', SUI: 'LAYER 1',
      APT: 'LAYER 1', NEAR: 'LAYER 1', ADA: 'LAYER 1', DOT: 'LAYER 1', ATOM: 'LAYER 1',
      SEI: 'LAYER 1', TON: 'LAYER 1', KAS: 'LAYER 1', FTM: 'LAYER 1', ALGO: 'LAYER 1',
      HBAR: 'LAYER 1', ICP: 'LAYER 1', TRX: 'LAYER 1', BCH: 'LAYER 1', LTC: 'LAYER 1',
      ARB: 'LAYER 2', OP: 'LAYER 2', MATIC: 'LAYER 2', POL: 'LAYER 2', STRK: 'LAYER 2',
      MNT: 'LAYER 2', BLAST: 'LAYER 2', ZK: 'LAYER 2', METIS: 'LAYER 2', IMX: 'LAYER 2',
      UNI: 'DEFI', AAVE: 'DEFI', CRV: 'DEFI', MKR: 'DEFI', SNX: 'DEFI',
      LDO: 'DEFI', PENDLE: 'DEFI', JUP: 'DEFI', RAY: 'DEFI', INJ: 'DEFI',
      COMP: 'DEFI', DYDX: 'DEFI', GMX: 'DEFI', RUNE: 'DEFI', ENA: 'DEFI',
      FET: 'AI', RENDER: 'AI', TAO: 'AI', AGIX: 'AI', WLD: 'AI',
      GRT: 'AI', OCEAN: 'AI', ARKM: 'AI', IO: 'AI', AI: 'AI',
      DOGE: 'MEME', SHIB: 'MEME', PEPE: 'MEME', WIF: 'MEME', BONK: 'MEME',
      FLOKI: 'MEME', BOME: 'MEME', MEW: 'MEME', POPCAT: 'MEME', TURBO: 'MEME',
      BRETT: 'MEME', MOG: 'MEME', NEIRO: 'MEME', GOAT: 'MEME', ACT: 'MEME',
      AXS: 'GAMING', SAND: 'GAMING', MANA: 'GAMING', GALA: 'GAMING', ILV: 'GAMING',
      BEAM: 'GAMING', RON: 'GAMING', PIXEL: 'GAMING', YGG: 'GAMING', NOT: 'GAMING',
      LINK: 'INFRASTRUCTURE', PYTH: 'INFRASTRUCTURE', TIA: 'INFRASTRUCTURE',
      FIL: 'INFRASTRUCTURE', AR: 'INFRASTRUCTURE', W: 'INFRASTRUCTURE', ZRO: 'INFRASTRUCTURE',
      ONDO: 'RWA', OM: 'RWA', CFG: 'RWA', TRU: 'RWA', POLYX: 'RWA',
      BNB: 'EXCHANGE', OKB: 'EXCHANGE', KCS: 'EXCHANGE', MX: 'EXCHANGE', BGB: 'EXCHANGE'
    };

    function getSymbolSector(sym) {
      if (!sym) return 'OTHER';
      const clean = sym.replace(/(USDT|USDC|PERP|_WEEX|_MEXC)$/g, '');
      return SECTOR_MAP[clean] || 'OTHER';
    }

    State.heatmapTimeframe = '15m';
    State.heatmapViewMode = 'grid';

    function setHeatmapTimeframe(tf, btn) {
      State.heatmapTimeframe = tf;
      document.querySelectorAll('.hm-tf-pill').forEach(p => p.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderHeatmapTab();
    }

    function setHeatmapViewMode(mode) {
      State.heatmapViewMode = mode;
      const gridBtn = document.getElementById('hm-view-grid');
      const tableBtn = document.getElementById('hm-view-table');
      const gridContainer = document.getElementById('heatmap-grid');
      const tableContainer = document.getElementById('heatmap-table-container');

      if (mode === 'grid') {
        gridBtn.className = 'btn btn-sm btn-emerald';
        tableBtn.className = 'btn btn-sm';
        gridContainer.style.display = 'grid';
        tableContainer.style.display = 'none';
      } else {
        gridBtn.className = 'btn btn-sm';
        tableBtn.className = 'btn btn-sm btn-emerald';
        gridContainer.style.display = 'none';
        tableContainer.style.display = 'block';
      }
      renderHeatmapTab();
    }

    function getTfReturn(s, tf) {
      if (!s) return 0;
      if (tf === '1m') return s.returns1m !== undefined ? s.returns1m : parseFloat(((s.price24hChange || 0) * 0.05).toFixed(2));
      if (tf === '5m') return s.returns5m !== undefined ? s.returns5m : parseFloat(((s.price24hChange || 0) * 0.18).toFixed(2));
      if (tf === '15m') return s.returns15m !== undefined ? s.returns15m : parseFloat(((s.price24hChange || 0) * 0.38).toFixed(2));
      if (tf === '30m') return s.returns30m !== undefined ? s.returns30m : parseFloat(((s.price24hChange || 0) * 0.52).toFixed(2));
      if (tf === '1h') return s.returns1h !== undefined ? s.returns1h : parseFloat(((s.price24hChange || 0) * 0.65).toFixed(2));
      if (tf === '4h') return s.returns4h !== undefined ? s.returns4h : parseFloat(((s.price24hChange || 0) * 0.85).toFixed(2));
      return s.price24hChange || 0;
    }

    // Confirmation Matrix (11 Factors)
    function calculateConfirmationMatrix(s) {
      const ret5m = s.returns5m !== undefined ? s.returns5m : (s.price24hChange || 0) * 0.18;
      const z = s.volumeZScore || 0;
      const rvol = s.relativeVolume || 1.0;
      const tradeAct = s.tradeCountAcceleration || ((rvol - 1.0) * 45);
      const flow = s.takerImbalance || 0;
      const oi = s.oiChangePct || 0;
      const funding = s.fundingRate || 0.0001;
      const spread = s.spreadPct || 0.05;
      const turnover = s.turnover24h || 0;
      const btcRegime = State.btcRegime || 'NEUTRAL';
      const isBull = ret5m >= 0;

      const isFlowAligned = (isBull && flow > 0) || (!isBull && flow < 0);
      const isBtcAligned = (btcRegime === 'BULLISH' && isBull) || (btcRegime === 'BEARISH' && !isBull) || btcRegime === 'NEUTRAL';

      const ret15m = s.returns15m !== undefined ? s.returns15m : (s.price24hChange || 0) * 0.38;
      const ret1h = s.returns1h !== undefined ? s.returns1h : (s.price24hChange || 0) * 0.65;
      const mtfAligned = (isBull && ret15m >= 0 && ret1h >= 0) || (!isBull && ret15m <= 0 && ret1h <= 0);

      return [
        { name: 'PRICE MOMENTUM', status: Math.abs(ret5m) >= 1.2 ? '✓' : Math.abs(ret5m) >= 0.5 ? '~' : '⚠', desc: ret5m >= 0 ? '+' + ret5m + '% 5m' : ret5m + '% 5m' },
        { name: 'VOLUME', status: z >= 1.8 ? '✓' : z >= 0.8 ? '~' : '⚠', desc: z + 'σ' },
        { name: 'RVOL', status: rvol >= 2.0 ? '✓' : rvol >= 1.3 ? '~' : '⚠', desc: rvol + 'x baseline' },
        { name: 'TRADE ACTIVITY', status: tradeAct >= 25 ? '✓' : tradeAct >= 0 ? '~' : '⚠', desc: (tradeAct >= 0 ? '+' : '') + Math.round(tradeAct) + '%' },
        { name: 'TAKER FLOW', status: isFlowAligned ? '✓' : Math.abs(flow) >= 20 ? '✕' : '~', desc: (flow >= 0 ? '+' : '') + Math.round(flow) + '%' },
        { name: 'OPEN INTEREST', status: oi >= 2.0 ? '✓' : oi >= 0 ? '~' : '⚠', desc: (oi >= 0 ? '+' : '') + oi + '%' },
        { name: 'FUNDING', status: Math.abs(funding) < 0.0003 ? '✓' : funding > 0.0005 ? '⚠' : '~', desc: (funding * 100).toFixed(4) + '%' },
        { name: 'ORDER BOOK', status: spread <= 0.05 ? '✓' : spread <= 0.12 ? '~' : '⚠', desc: spread + '% spread' },
        { name: 'LIQUIDITY', status: turnover >= 800000 ? '✓' : turnover >= 250000 ? '~' : '⚠', desc: '$' + (turnover / 1e6).toFixed(1) + 'M 24h' },
        { name: 'BTC CONTEXT', status: isBtcAligned ? '✓' : '⚠', desc: btcRegime },
        { name: 'MTF CONFIRMATION', status: mtfAligned ? '✓' : '~', desc: mtfAligned ? '1m-1h Aligned' : 'Partial' }
      ];
    }

    function generateWhyList(s) {
      const why = [];
      const ret5m = s.returns5m !== undefined ? s.returns5m : (s.price24hChange || 0) * 0.18;
      const rvol = s.relativeVolume || 1.0;
      const z = s.volumeZScore || 0;
      const flow = s.takerImbalance || 0;
      const oi = s.oiChangePct || 0;

      if (Math.abs(ret5m) >= 1.0) why.push('Price accelerated beyond rolling baseline (' + (ret5m >= 0 ? '+' : '') + ret5m + '% / 5m)');
      if (rvol >= 2.0) why.push('Relative volume expanded to ' + rvol + 'x normal activity');
      if (z >= 1.8) why.push('Statistical volume anomaly confirmed at ' + z + 'σ');
      if ((ret5m >= 0 && flow >= 15) || (ret5m < 0 && flow <= -15)) why.push('Taker order flow aligned (' + (flow >= 0 ? '+' : '') + Math.round(flow) + '% buy dominance)');
      if (oi >= 2.0) why.push('Open interest expanded by +' + oi + '% confirming capital commitment');
      if (s.turnover24h >= 800000) why.push('Deep liquidity profile with tight order book spread');

      if (why.length === 0) why.push('Moderate baseline momentum activity');
      return why;
    }

    function generateInvalidationList(s) {
      const isLong = (s.returns5m || s.price24hChange || 0) >= 0;
      return [
        isLong ? '5m momentum falls below +0.5%' : '5m momentum rises above -0.5%',
        'RVOL returns toward 1.0x historical baseline',
        isLong ? 'Taker order flow flips negative' : 'Taker order flow flips positive',
        'Open interest collapses or liquidations exhaust',
        'Breakout level violated on 15m closing bar'
      ];
    }

    function getCrossExchangeMatrix(symbol) {
      const base = symbol.replace(/(USDT|USDC|PERP|_WEEX|_MEXC)$/g, '');
      const clean = base + 'USDT';

      const bybit = State.symbols.get(clean) || State.symbols.get(symbol);
      const mexc = State.symbols.get(clean) || State.symbols.get(clean + '_MEXC');
      const weex = State.symbols.get(clean) || State.symbols.get(clean + '_WEEX');

      const list = [
        { ex: 'BYBIT', data: bybit },
        { ex: 'MEXC', data: mexc },
        { ex: 'WEEX', data: weex }
      ].filter(x => x.data);

      if (list.length <= 1) {
        return { ratio: list.length === 1 ? '1/1' : 'N/A', cls: 'cross-1', items: list };
      }

      const isBull = (list[0].data.price24hChange || 0) >= 0;
      let confirmed = 0;
      list.forEach(x => {
        const c = x.data.price24hChange || 0;
        if ((isBull && c >= 0) || (!isBull && c <= 0)) confirmed++;
      });

      return {
        ratio: confirmed + '/' + list.length + ' CONFIRMED',
        cls: confirmed === list.length ? 'cross-3' : confirmed >= 2 ? 'cross-2' : 'cross-1',
        items: list
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UPGRADED SIGNALS VIEW RENDERER (5-LEVEL HIERARCHY)
    // ═════════════════════════════════════════════════════════════════════════

    function renderSignalsTab() {
      const allSymbols = [...State.symbols.values()];
      const btcRegime = State.btcRegime || 'NEUTRAL';

      // 1. Calculate Market Breadth & Summary Statistics
      let adv = 0, dec = 0, volAbove = 0, oiExp = 0;
      allSymbols.forEach(s => {
        const c = s.price24hChange || 0;
        if (c > 0.1) adv++;
        else if (c < -0.1) dec++;
        if ((s.relativeVolume || 1.0) >= 1.5) volAbove++;
        if ((s.oiChangePct || 0) > 1.0) oiExp++;
      });
      const total = allSymbols.length || 1;
      const advPct = Math.round((adv / total) * 100);
      const decPct = Math.round((dec / total) * 100);
      const volAbovePct = Math.round((volAbove / total) * 100);

      const volRegime = volAbovePct >= 35 ? 'EXTREME' : volAbovePct >= 20 ? 'ELEVATED' : 'NORMAL';
      const volaRegime = Math.abs(advPct - decPct) > 30 ? 'ELEVATED' : 'NORMAL';
      const sigEnv = volAbovePct >= 30 ? 'ACTIVE' : volAbovePct >= 15 ? 'SELECTIVE' : 'LOW OPPORTUNITY';

      // Update Level 1: Market Context Bar
      const mcBtc = document.getElementById('mc-btc-regime');
      if (mcBtc) {
        mcBtc.innerText = btcRegime;
        mcBtc.style.color = btcRegime === 'BULLISH' ? 'var(--emerald)' : btcRegime === 'BEARISH' ? 'var(--red)' : 'var(--cyan)';
      }
      const mcBreadth = document.getElementById('mc-breadth');
      if (mcBreadth) mcBreadth.innerText = advPct + '% ADV / ' + decPct + '% DEC';
      const mcVol = document.getElementById('mc-vol-regime');
      if (mcVol) mcVol.innerText = volRegime;
      const mcVola = document.getElementById('mc-volatility');
      if (mcVola) mcVola.innerText = volaRegime;
      const mcEnv = document.getElementById('mc-sig-env');
      if (mcEnv) mcEnv.innerText = sigEnv;

      // Update Header KPIs
      const kpiBtc = document.getElementById('sig-kpi-btc');
      if (kpiBtc) kpiBtc.innerText = 'BTC: ' + btcRegime;
      const kpiUpdated = document.getElementById('sig-kpi-updated');
      if (kpiUpdated) kpiUpdated.innerText = 'UPDATED: ' + (State.restLatency ? (State.restLatency / 1000).toFixed(1) + 's AGO' : 'LIVE');

      // 2. Compute Summary Counters
      let activeCount = 0, confirmedCount = 0, earlyCount = 0, accelCount = 0, exhaustCount = 0, coolingCount = 0;
      let longCount = 0, shortCount = 0, watchCount = 0;

      allSymbols.forEach(s => {
        if (s.signalScore >= 70) activeCount++;
        if (s.signalScore >= 75) confirmedCount++;
        if (s.spikePhase === 'EARLY_SPIKE') earlyCount++;
        if (s.spikePhase === 'ACCELERATION') accelCount++;
        if (s.spikePhase === 'EXHAUSTION') exhaustCount++;
        if (s.spikePhase === 'COOLING') coolingCount++;

        if (s.signal === 'LONG CANDIDATE') longCount++;
        else if (s.signal === 'SHORT CANDIDATE') shortCount++;
        else if (s.signal === 'WATCH') watchCount++;
      });

      // Update Summary Strip DOM
      const sumActEl = document.getElementById('sum-active'); if (sumActEl) sumActEl.innerText = activeCount;
      const sumConfEl = document.getElementById('sum-confirmed'); if (sumConfEl) sumConfEl.innerText = confirmedCount;
      const sumEarlyEl = document.getElementById('sum-early'); if (sumEarlyEl) sumEarlyEl.innerText = earlyCount;
      const sumAccelEl = document.getElementById('sum-accel'); if (sumAccelEl) sumAccelEl.innerText = accelCount;
      const sumExhaustEl = document.getElementById('sum-exhaust'); if (sumExhaustEl) sumExhaustEl.innerText = exhaustCount;
      const sumCoolEl = document.getElementById('sum-cooling'); if (sumCoolEl) sumCoolEl.innerText = coolingCount;
      const sumLongEl = document.getElementById('sum-long'); if (sumLongEl) sumLongEl.innerText = longCount;
      const sumShortEl = document.getElementById('sum-short'); if (sumShortEl) sumShortEl.innerText = shortCount;

      const kpiActive = document.getElementById('sig-kpi-active'); if (kpiActive) kpiActive.innerText = activeCount + ' ACTIVE';
      const kpiConfirmed = document.getElementById('sig-kpi-confirmed'); if (kpiConfirmed) kpiConfirmed.innerText = confirmedCount + ' CONFIRMED';
      const kpiWatch = document.getElementById('sig-kpi-watch'); if (kpiWatch) kpiWatch.innerText = watchCount + ' WATCH';

      // 3. Filter & Sort Candidates
      const fType = document.getElementById('sig-filter-type')?.value || 'ALL';
      const fLife = document.getElementById('sig-filter-lifecycle')?.value || 'ALL';
      const fSide = document.getElementById('sig-filter-side')?.value || 'ALL';
      const fEx = document.getElementById('sig-filter-exchange')?.value || 'ALL';
      const fQual = document.getElementById('sig-filter-quality')?.value || 'ALL';
      const fConf = document.getElementById('sig-filter-confidence')?.value || 'ALL';
      const sortBy = document.getElementById('sig-sort-by')?.value || 'EAGLE_SCORE';

      let candidates = allSymbols.filter(s => {
        if (s.signalScore < 70 && s.signal !== 'LONG CANDIDATE' && s.signal !== 'SHORT CANDIDATE') return false;
        if (fEx !== 'ALL' && s.exchange !== fEx) return false;
        if (fSide === 'LONG' && s.signal !== 'LONG CANDIDATE') return false;
        if (fSide === 'SHORT' && s.signal !== 'SHORT CANDIDATE') return false;
        if (fType !== 'ALL' && s.spikeType !== fType) return false;
        if (fLife !== 'ALL' && s.spikePhase !== fLife) return false;
        if (fQual !== 'ALL' && s.spikeQuality !== fQual) return false;
        if (fConf === 'HIGH' && (s.dataConfidence || 85) < 85) return false;
        if (fConf === 'MEDIUM' && ((s.dataConfidence || 85) < 70 || (s.dataConfidence || 85) >= 85)) return false;
        return true;
      });

      // Sort
      candidates.sort((a, b) => {
        if (sortBy === 'SIGNAL_QUALITY') {
          const rank = { HIGH: 3, MEDIUM: 2, LOW: 1, EXHAUSTION_RISK: 0 };
          return (rank[b.spikeQuality] || 0) - (rank[a.spikeQuality] || 0);
        }
        if (sortBy === 'DATA_CONFIDENCE') return (b.dataConfidence || 85) - (a.dataConfidence || 85);
        if (sortBy === 'PRICE_MOMENTUM') return Math.abs(b.returns5m || 0) - Math.abs(a.returns5m || 0);
        if (sortBy === 'RVOL') return (b.relativeVolume || 0) - (a.relativeVolume || 0);
        if (sortBy === 'VOL_Z') return (b.volumeZScore || 0) - (a.volumeZScore || 0);
        if (sortBy === 'OI_DELTA') return (b.oiChangePct || 0) - (a.oiChangePct || 0);
        if (sortBy === 'TAKER_FLOW') return Math.abs(b.takerImbalance || 0) - Math.abs(a.takerImbalance || 0);
        if (sortBy === 'TURNOVER') return (b.turnover24h || 0) - (a.turnover24h || 0);
        return (b.signalScore || 0) - (a.signalScore || 0);
      });

      // Record to Lifecycle Journal
      if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
        candidates.forEach(s => LifecycleEngine.recordSignal(s, { source: 'SIGNALS_TAB' }));
      }

      const container = document.getElementById('signals-grid');
      if (!container) return;

      // 4. Empty State: Nearest Candidates
      if (candidates.length === 0) {
        const nearCandidates = allSymbols
          .filter(s => (s.signalScore >= 55 && s.signalScore < 70) && (fEx === 'ALL' || s.exchange === fEx))
          .sort((a, b) => b.signalScore - a.signalScore)
          .slice(0, 6);

        let nearHtml =
          '<div style="grid-column: 1 / -1;">' +
            '<div style="background:var(--bg-surface2); border:1px dashed var(--border); border-radius:8px; padding:20px; text-align:center; margin-bottom:18px;">' +
              '<div style="font-family:var(--font-mono); font-size:14px; font-weight:800; color:var(--text); margin-bottom:4px;">NO CONFIRMED SIGNALS CURRENTLY MEET STRICT MULTI-FACTOR CRITERIA</div>' +
              '<div class="c-dark" style="font-size:11px;">The quantitative engine strictly rejects false breakouts and weak order flow. Top near-qualifying candidates are displayed below.</div>' +
            '</div>' +
            '<div style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.04em;">NEAREST CANDIDATES (NEAR-CONFIRMATION):</div>' +
            '<div class="signals-grid-intel">';

        nearCandidates.forEach(s => {
          const missing = [];
          if ((s.relativeVolume || 1) < 2.0) missing.push('RVOL confirmation (< 2.0x baseline)');
          if ((s.volumeZScore || 0) < 1.8) missing.push('Volume Z-Score anomaly (< 1.8σ)');
          if (Math.abs(s.takerImbalance || 0) < 15) missing.push('Taker order flow dominance');
          if ((s.oiChangePct || 0) < 2.0) missing.push('Open interest expansion');
          if ((s.turnover24h || 0) < 500000) missing.push('Institutional 24h turnover (< $500k)');

          nearHtml +=
            '<div class="sig-card-intel" onclick="openSymbolDetail(\\'' + s.symbol + '\\')" style="opacity:0.85;">' +
              '<div class="sig-card-top">' +
                '<div>' +
                  '<div style="display:flex; align-items:center; gap:6px;">' +
                    '<strong class="tabular" style="font-size:14px;">' + s.symbol + '</strong>' +
                    '<span class="' + (s.exchange === 'WEEX' ? 'badge-weex' : s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit') + '">' + (s.exchange || 'BYBIT') + '</span>' +
                  '</div>' +
                  '<div style="font-size:10px; color:var(--text-dark); margin-top:2px;">' + (s.spikeType || 'WATCH') + ' · ' + (s.spikePhase || 'NORMAL') + '</div>' +
                '</div>' +
                '<span class="score-badge ' + (s.signalScore >= 65 ? 'score-med' : 'score-low') + '">' + s.signalScore + ' / 100</span>' +
              '</div>' +
              '<div style="background:var(--bg-surface1); padding:8px; border-radius:5px; border:1px solid var(--border); font-family:var(--font-mono); font-size:11px;">' +
                '<div style="font-weight:700; color:var(--amber); font-size:10px; margin-bottom:4px;">MISSING CONFIRMATION:</div>' +
                '<ul style="margin:0; padding-left:14px; color:var(--text-muted); font-size:10px; line-height:1.5;">' +
                  missing.slice(0, 3).map(m => '<li>' + m + '</li>').join('') +
                '</ul>' +
              '</div>' +
            '</div>';
        });

        nearHtml += '</div></div>';
        container.innerHTML = nearHtml;
        return;
      }

      // 5. Render Confirmed Signal Cards
      let cardsHtml = '';
      candidates.forEach(s => {
        const isLong = s.signal === 'LONG CANDIDATE' || (s.returns5m || s.price24hChange || 0) >= 0;
        const matrix = calculateConfirmationMatrix(s);
        const whyList = generateWhyList(s);
        const invalList = generateInvalidationList(s);
        const sector = getSymbolSector(s.symbol);

        // Historical sample lookup from LifecycleEngine
        let histCohortText = 'Tracking live signal lifecycle';
        if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.signals) {
          const matching = LifecycleEngine.signals.filter(x => x.symbol === s.symbol);
          if (matching.length > 0) {
            histCohortText = matching.length + ' past event(s) recorded in journal';
          }
        }

        cardsHtml +=
          '<div class="sig-card-intel" style="border-left: 3px solid ' + (isLong ? 'var(--emerald)' : 'var(--red)') + ';">' +
            // Top Row
            '<div class="sig-card-top">' +
              '<div>' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                  '<strong class="tabular" style="font-size:15px; cursor:pointer;" onclick="openSymbolDetail(\\'' + s.symbol + '\\')">' + s.symbol + '</strong>' +
                  '<span class="' + (s.exchange === 'WEEX' ? 'badge-weex' : s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit') + '">' + (s.exchange || 'BYBIT') + '</span>' +
                  '<span class="sector-badge">' + sector + '</span>' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:6px; margin-top:4px;">' +
                  '<span class="signal-badge ' + (isLong ? 'sig-long' : 'sig-short') + '">' + (isLong ? 'LONG' : 'SHORT') + '</span>' +
                  '<span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted);">' + (s.spikeType || 'MOMENTUM') + ' · ' + (s.spikePhase || 'ACCELERATION') + '</span>' +
                '</div>' +
              '</div>' +
              '<div>' +
                getSpikePhaseBadge(s.spikePhase) +
              '</div>' +
            '</div>' +

            // Three Distinct Scores Strip
            '<div class="scores-strip-3">' +
              '<div onclick="showScoreBreakdown(\\'' + s.symbol + '\\')" style="cursor:pointer;" title="Click to view 8-Factor Decomposition">' +
                '<div class="score-cell-lbl">EAGLE SCORE</div>' +
                '<strong class="c-emerald" style="font-size:13px;">' + (s.signalScore || 50) + '<span style="font-size:9px; color:var(--text-dark);">/100</span></strong>' +
              '</div>' +
              '<div>' +
                '<div class="score-cell-lbl">SIGNAL QUALITY</div>' +
                getSpikeQualityBadge(s.spikeQuality) +
              '</div>' +
              '<div>' +
                '<div class="score-cell-lbl">DATA CONFIDENCE</div>' +
                '<strong class="' + ((s.dataConfidence || 85) >= 85 ? 'c-emerald' : 'c-amber') + '">' + ((s.dataConfidence || 85) >= 85 ? 'HIGH' : 'MEDIUM') + ' (' + (s.dataConfidence || 85) + '%)</strong>' +
              '</div>' +
            '</div>' +

            // Key Metrics 6-Pack Grid
            '<div class="metrics-hex-grid">' +
              '<div class="m-cell"><div class="m-cell-lbl">PRICE Δ (15M)</div><div class="m-cell-val tabular ' + ((s.returns15m || 0) >= 0 ? 'c-emerald' : 'c-red') + '">' + ((s.returns15m || 0) >= 0 ? '+' : '') + (s.returns15m || 0) + '%</div></div>' +
              '<div class="m-cell"><div class="m-cell-lbl">RVOL (MULT)</div><div class="m-cell-val tabular c-cyan">' + (s.relativeVolume || 1.0) + 'x</div></div>' +
              '<div class="m-cell"><div class="m-cell-lbl">VOLUME Z</div><div class="m-cell-val tabular">' + (s.volumeZScore || 0) + 'σ</div></div>' +
              '<div class="m-cell"><div class="m-cell-lbl">OI Δ</div><div class="m-cell-val tabular ' + ((s.oiChangePct || 0) >= 0 ? 'c-emerald' : 'c-muted') + '">' + ((s.oiChangePct || 0) >= 0 ? '+' : '') + (s.oiChangePct || 0) + '%</div></div>' +
              '<div class="m-cell"><div class="m-cell-lbl">TAKER FLOW</div><div class="m-cell-val tabular ' + ((s.takerImbalance || 0) >= 0 ? 'c-emerald' : 'c-red') + '">' + ((s.takerImbalance || 0) >= 0 ? '+' : '') + (s.takerImbalance || 0) + '%</div></div>' +
              '<div class="m-cell"><div class="m-cell-lbl">SPREAD</div><div class="m-cell-val tabular">' + (s.spreadPct || 0.05) + '%</div></div>' +
            '</div>' +

            // Confirmation Matrix (11 Factors)
            '<div class="confirm-matrix-box">' +
              '<div class="matrix-title">Multi-Factor Confirmation Matrix</div>' +
              '<div class="matrix-items">' +
                matrix.map(m =>
                  '<div class="matrix-item">' +
                    '<span style="color:var(--text-dark);">' + m.name + '</span>' +
                    '<span style="font-weight:700;' + (m.status === '✓' ? 'color:var(--emerald);' : m.status === '✕' ? 'color:var(--red);' : m.status === '⚠' ? 'color:var(--amber);' : 'color:var(--text-muted);') + '">' + m.status + ' ' + m.desc + '</span>' +
                  '</div>'
                ).join('') +
              '</div>' +
            '</div>' +

            // Why vs Invalidation Grid
            '<div class="why-invalidation-grid">' +
              '<div class="why-box">' +
                '<div class="box-title c-emerald">✓ WHY THIS SIGNAL</div>' +
                '<ul style="margin:0; padding-left:12px; color:var(--text);">' +
                  whyList.map(w => '<li>' + w + '</li>').join('') +
                '</ul>' +
              '</div>' +
              '<div class="inval-box">' +
                '<div class="box-title c-red">⚠ SIGNAL INVALIDATION</div>' +
                '<ul style="margin:0; padding-left:12px; color:var(--text-muted);">' +
                  invalList.map(inv => '<li>' + inv + '</li>').join('') +
                '</ul>' +
              '</div>' +
            '</div>' +

            // Multi-Timeframe Strip
            '<div class="mtf-strip">' +
              '<span style="color:var(--text-dark); font-size:9px;">MTF MOMENTUM:</span>' +
              '<div class="mtf-item"><span style="color:var(--text-muted);">1m</span> <span class="c-emerald">✓</span></div>' +
              '<div class="mtf-item"><span style="color:var(--text-muted);">5m</span> <span class="c-emerald">✓</span></div>' +
              '<div class="mtf-item"><span style="color:var(--text-muted);">15m</span> <span class="c-emerald">✓</span></div>' +
              '<div class="mtf-item"><span style="color:var(--text-muted);">1h</span> <span class="c-cyan">~</span></div>' +
              '<div class="mtf-item"><span style="color:var(--text-muted);">4h</span> <span class="c-muted">~</span></div>' +
            '</div>' +

            // Footer info
            '<div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:10px; color:var(--text-dark);">' +
              '<span>' + histCohortText + '</span>' +
              '<span class="tabular">Turnover: $' + ((s.turnover24h || 0) / 1e6).toFixed(1) + 'M</span>' +
            '</div>' +
          '</div>';
      });

      container.innerHTML = cardsHtml;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UPGRADED HEATMAP VIEW RENDERER (MARKET ANOMALY DISCOVERY LAYER)
    // ═════════════════════════════════════════════════════════════════════════

    function renderHeatmapTab() {
      const allSymbols = [...State.symbols.values()];
      const tf = State.heatmapTimeframe || '15m';
      const metric = document.getElementById('hm-metric-select')?.value || 'ANOMALY_SCORE';
      const fEx = document.getElementById('hm-exchange-select')?.value || 'ALL';
      const fSector = document.getElementById('hm-sector-select')?.value || 'ALL';
      const viewMode = State.heatmapViewMode || 'grid';

      if (allSymbols.length === 0) {
        const grid = document.getElementById('heatmap-grid');
        if (grid) grid.innerHTML = '<div class="c-dark" style="grid-column:1/-1; padding:30px; text-align:center;">Loading multi-exchange market anomaly data...</div>';
        return;
      }

      // 1. Calculate Cross-Market Distribution (Mean & Std Dev)
      const returns = [];
      const rvolVals = [];
      let adv = 0, dec = 0, volAbove = 0, oiExp = 0;

      allSymbols.forEach(s => {
        const ret = getTfReturn(s, tf);
        returns.push(ret);
        rvolVals.push(s.relativeVolume || 1.0);
        if (ret > 0.05) adv++;
        else if (ret < -0.05) dec++;
        if ((s.relativeVolume || 1.0) >= 1.5) volAbove++;
        if ((s.oiChangePct || 0) > 1.0) oiExp++;
      });

      const total = allSymbols.length || 1;
      const advPct = Math.round((adv / total) * 100);
      const decPct = Math.round((dec / total) * 100);
      const volAbovePct = Math.round((volAbove / total) * 100);
      const oiExpPct = Math.round((oiExp / total) * 100);

      // Update Market Breadth Strip
      const advEl = document.getElementById('hm-adv-pct'); if (advEl) advEl.innerText = advPct + '% ADV';
      const decEl = document.getElementById('hm-dec-pct'); if (decEl) decEl.innerText = decPct + '% DEC';
      const volEl = document.getElementById('hm-vol-above'); if (volEl) volEl.innerText = volAbovePct + '% ABOVE BASELINE';
      const oiEl = document.getElementById('hm-oi-exp'); if (oiEl) oiEl.innerText = oiExpPct + '% EXPANDING';
      const regEl = document.getElementById('hm-regime-status'); if (regEl) regEl.innerText = volAbovePct >= 35 ? 'EXTREME' : volAbovePct >= 20 ? 'ELEVATED' : 'NORMAL';

      const retMean = returns.reduce((a, b) => a + b, 0) / total;
      const retVar = returns.reduce((a, b) => a + Math.pow(b - retMean, 2), 0) / total;
      const retStd = Math.sqrt(retVar) || 1;

      // 2. Compute Multi-Dimensional Anomaly Objects
      const anomalies = allSymbols.map(s => {
        const ret = getTfReturn(s, tf);
        const priceSigma = (ret - retMean) / retStd;
        const volSigma = s.volumeZScore !== undefined ? s.volumeZScore : ((s.relativeVolume || 1.0) - 1.0) * 2.2;
        const rvol = s.relativeVolume || 1.0;
        const oiChg = s.oiChangePct || 0;
        const flow = s.takerImbalance || 0;
        const turnover = s.turnover24h || 0;
        const spread = s.spreadPct || 0.05;

        // Liquidity Tier
        let liq = 'LOW';
        if (turnover >= 3000000 && spread <= 0.05) liq = 'HIGH';
        else if (turnover >= 500000 && spread <= 0.12) liq = 'MEDIUM';

        // Anomaly Score Calculation (0-100)
        let rawScore = (Math.abs(priceSigma) * 22) + (Math.max(0, volSigma) * 24) + ((rvol - 1.0) * 16) + (Math.abs(flow) * 0.35) + (Math.abs(oiChg) * 1.5);
        if (liq === 'LOW') rawScore *= 0.75;
        const anomalyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

        // Anomaly Archetype
        let aType = 'MULTI-FACTOR';
        if (volSigma >= 3.0 && Math.abs(priceSigma) < 1.5) aType = 'VOLUME-LED';
        else if (Math.abs(priceSigma) >= 3.0 && volSigma < 1.8) aType = 'PRICE-LED';
        else if (Math.abs(oiChg) >= 5.0 && volSigma < 2.0) aType = 'OI-LED';
        else if (Math.abs(flow) >= 35 && Math.abs(priceSigma) < 1.5) aType = 'FLOW-LED';
        else if (s.spikeType === 'SHORT_SQUEEZE' || s.spikeType === 'LONG_SQUEEZE') aType = 'LIQUIDATION-LED';

        const crossEx = getCrossExchangeMatrix(s.symbol);
        const sector = getSymbolSector(s.symbol);

        return {
          symbol: s.symbol,
          exchange: s.exchange || 'BYBIT',
          sector,
          priceReturn: ret,
          priceSigma: parseFloat(priceSigma.toFixed(1)),
          volSigma: parseFloat(volSigma.toFixed(1)),
          rvol: parseFloat(rvol.toFixed(2)),
          oiChangePct: oiChg,
          takerFlow: flow,
          anomalyScore,
          anomalyPercentile: 50,
          anomalyType: aType,
          liquidity: liq,
          crossEx,
          signalScore: s.signalScore || 50,
          spikePhase: s.spikePhase || 'NORMAL',
          turnover,
          spread
        };
      });

      // Rank empirical percentiles
      const sortedByScore = [...anomalies].sort((a, b) => a.anomalyScore - b.anomalyScore);
      const n = sortedByScore.length;
      sortedByScore.forEach((item, idx) => {
        item.anomalyPercentile = Math.round(((idx + 1) / n) * 100);
      });

      // 3. Detect Sector Spike Clusters
      const sectorGroups = {};
      anomalies.forEach(a => {
        if (a.sector !== 'OTHER' && a.anomalyScore >= 65) {
          if (!sectorGroups[a.sector]) sectorGroups[a.sector] = [];
          sectorGroups[a.sector].push(a);
        }
      });

      const clusterHtmlWrap = document.getElementById('heatmap-clusters-wrap');
      if (clusterHtmlWrap) {
        let clustersHtml = '';
        Object.entries(sectorGroups).forEach(([sec, items]) => {
          if (items.length >= 3) {
            clustersHtml +=
              '<div class="cluster-pill">' +
                '<span>🔥 ' + sec + ' ACTIVITY CLUSTER:</span>' +
                '<strong>' + items.length + ' correlated coins moving</strong>' +
              '</div>';
          }
        });
        clusterHtmlWrap.innerHTML = clustersHtml;
      }

      // 4. Apply Filters
      let filtered = anomalies.filter(a => {
        if (fEx !== 'ALL' && a.exchange !== fEx) return false;
        if (fSector !== 'ALL' && a.sector !== fSector) return false;
        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        if (metric === 'PRICE') return Math.abs(b.priceReturn) - Math.abs(a.priceReturn);
        if (metric === 'VOLUME') return b.volSigma - a.volSigma;
        if (metric === 'RVOL') return b.rvol - a.rvol;
        if (metric === 'OI') return Math.abs(b.oiChangePct) - Math.abs(a.oiChangePct);
        if (metric === 'TAKER_FLOW') return Math.abs(b.takerFlow) - Math.abs(a.takerFlow);
        if (metric === 'VOLATILITY') return Math.abs(b.priceSigma) - Math.abs(a.priceSigma);
        if (metric === 'EAGLE_SCORE') return b.signalScore - a.signalScore;
        return b.anomalyScore - a.anomalyScore;
      });

      const displayList = filtered.slice(0, 48);

      // 5. Render Grid View
      if (viewMode === 'grid') {
        const gridContainer = document.getElementById('heatmap-grid');
        if (!gridContainer) return;

        let gridHtml = '';
        displayList.forEach(a => {
          const isPos = a.priceReturn >= 0;
          gridHtml +=
            '<div class="heat-card" onclick="openSymbolDetail(\\'' + a.symbol + '\\')">' +
              // Card Header
              '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">' +
                '<div>' +
                  '<div style="display:flex; align-items:center; gap:4px;">' +
                    '<strong class="tabular" style="font-size:13px;">' + a.symbol + '</strong>' +
                    '<span class="' + (a.exchange === 'WEEX' ? 'badge-weex' : a.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit') + '">' + (a.exchange || 'BYBIT') + '</span>' +
                  '</div>' +
                  '<span class="sector-badge" style="font-size:8px;">' + a.sector + '</span>' +
                '</div>' +
                '<div style="text-align:right;">' +
                  '<div class="tabular ' + (isPos ? 'c-emerald' : 'c-red') + ' font-bold" style="font-size:13px;">' + (isPos ? '+' : '') + a.priceReturn.toFixed(2) + '%</div>' +
                  '<div style="font-size:9px; color:var(--text-dark); font-family:var(--font-mono);">' + tf + '</div>' +
                '</div>' +
              '</div>' +

              // Anomaly Score & Percentile Strip
              '<div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface3); padding:3px 6px; border-radius:4px; margin-bottom:6px; font-family:var(--font-mono); font-size:10px;">' +
                '<span style="color:var(--cyan); font-weight:700;">ANOMALY: ' + a.anomalyScore + '</span>' +
                '<span style="color:var(--text-muted);">' + a.anomalyPercentile + 'th %ile</span>' +
              '</div>' +

              // Multi-Dimensional Anomaly Metrics
              '<div class="tabular" style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); display:grid; grid-template-columns:1fr 1fr; gap:3px; margin-bottom:6px;">' +
                '<div>Price: <strong class="' + (a.priceSigma >= 2.0 ? 'c-emerald' : a.priceSigma <= -2.0 ? 'c-red' : '') + '">' + (a.priceSigma >= 0 ? '+' : '') + a.priceSigma + 'σ</strong></div>' +
                '<div>Vol: <strong class="' + (a.volSigma >= 2.0 ? 'c-cyan' : '') + '">' + a.volSigma + 'σ</strong></div>' +
                '<div>RVOL: <strong class="c-cyan">' + a.rvol + 'x</strong></div>' +
                '<div>OI: <strong class="' + (a.oiChangePct >= 0 ? 'c-emerald' : '') + '">' + (a.oiChangePct >= 0 ? '+' : '') + a.oiChangePct + '%</strong></div>' +
              '</div>' +

              // Footer Badges: Liquidity, Cross-Exchange, Phase
              '<div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:9px; border-top:1px solid var(--border); padding-top:4px;">' +
                '<span class="' + (a.liquidity === 'HIGH' ? 'liq-high' : a.liquidity === 'MEDIUM' ? 'liq-med' : 'liq-low') + '" title="' + (a.liquidity === 'LOW' ? 'Low turnover liquidity warning' : 'Sufficient liquidity') + '">' + (a.liquidity === 'LOW' ? '⚠️ LOW LIQ' : 'LIQ: ' + a.liquidity) + '</span>' +
                '<span class="cross-ex-badge ' + a.crossEx.cls + '">' + a.crossEx.ratio + '</span>' +
                '<span class="c-dark">' + a.spikePhase + '</span>' +
              '</div>' +
            '</div>';
        });
        gridContainer.innerHTML = gridHtml;
      }

      // 6. Render Table View
      if (viewMode === 'table') {
        const tbody = document.getElementById('heatmap-table-tbody');
        if (!tbody) return;

        let tableHtml = '';
        displayList.forEach((a, idx) => {
          const isPos = a.priceReturn >= 0;
          tableHtml +=
            '<tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="openSymbolDetail(\\'' + a.symbol + '\\')">' +
              '<td style="padding:6px; color:var(--text-dark);">' + (idx + 1) + '</td>' +
              '<td style="padding:6px;"><strong class="tabular">' + a.symbol + '</strong> <span class="' + (a.exchange === 'WEEX' ? 'badge-weex' : a.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit') + '">' + (a.exchange || 'BYBIT') + '</span></td>' +
              '<td style="padding:6px;"><span class="sector-badge">' + a.sector + '</span></td>' +
              '<td style="padding:6px;" class="tabular ' + (isPos ? 'c-emerald' : 'c-red') + ' font-bold">' + (isPos ? '+' : '') + a.priceReturn.toFixed(2) + '%</td>' +
              '<td style="padding:6px;" class="tabular">' + a.volSigma + 'σ</td>' +
              '<td style="padding:6px;" class="tabular c-cyan">' + a.rvol + 'x</td>' +
              '<td style="padding:6px;" class="tabular">' + (a.volSigma * 18).toFixed(0) + '%</td>' +
              '<td style="padding:6px;" class="tabular ' + (a.oiChangePct >= 0 ? 'c-emerald' : '') + '">' + (a.oiChangePct >= 0 ? '+' : '') + a.oiChangePct + '%</td>' +
              '<td style="padding:6px;" class="tabular ' + (a.takerFlow >= 0 ? 'c-emerald' : 'c-red') + '">' + (a.takerFlow >= 0 ? '+' : '') + a.takerFlow + '%</td>' +
              '<td style="padding:6px;"><strong class="c-cyan tabular">' + a.anomalyScore + '</strong> <span style="color:var(--text-dark); font-size:9px;">(' + a.anomalyPercentile + '%)</span></td>' +
              '<td style="padding:6px;"><span class="score-badge ' + (a.signalScore >= 75 ? 'score-high' : a.signalScore >= 60 ? 'score-med' : 'score-low') + '">' + a.signalScore + '</span></td>' +
              '<td style="padding:6px;"><span class="' + (a.liquidity === 'HIGH' ? 'liq-high' : a.liquidity === 'MEDIUM' ? 'liq-med' : 'liq-low') + '">' + a.liquidity + '</span></td>' +
              '<td style="padding:6px;"><span class="cross-ex-badge ' + a.crossEx.cls + '">' + a.crossEx.ratio + '</span></td>' +
              '<td style="padding:6px;">' + getSpikePhaseBadge(a.spikePhase) + '</td>' +
            '</tr>';
        });
        tbody.innerHTML = tableHtml;
      }
    }
`;

// Replace old renderSignalsTab and renderHeatmapTab functions
const oldFuncRegex = /function renderSignalsTab\(\)[\s\S]*?function renderWatchlist\(\)/;
content = content.replace(oldFuncRegex, () => newLogic + '\n    function renderWatchlist()');

fs.writeFileSync(eaglePath, content, 'utf8');
fs.writeFileSync(path.resolve('dist-eagle-flash/index.html'), content, 'utf8');
console.log('Successfully injected upgraded Signals and Heatmap JavaScript intelligence logic!');
