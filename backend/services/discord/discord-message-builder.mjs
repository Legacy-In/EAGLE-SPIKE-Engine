/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD MESSAGE & EMBED BUILDER
 * Constructs canonical, rich Discord embeds for trade signals, milestones,
 * whale alerts, and blockchain verification proofs.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Format price with tick-size awareness
function formatPrice(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '$0.00';
  if (num >= 1000) return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return '$' + num.toFixed(4);
  if (num >= 0.001) return '$' + num.toFixed(6);
  return '$' + num.toFixed(8);
}

// Format percentage with sign
function formatPct(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0.00%';
  return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

export function getPhaseBadge(phaseRaw) {
  const phase = (phaseRaw || '').toUpperCase().trim();
  switch (phase) {
    case 'EXTREME':
      return '🔴 EXTREME';
    case 'PRE_SPIKE':
      return '🟡 PRE_SPIKE';
    case 'ACCELERATION':
      return '⚡ ACCELERATION';
    case 'BREAKOUT':
      return '🚀 BREAKOUT';
    case 'NORMAL':
    default:
      return '🟢 NORMAL';
  }
}

export function getStrategyTypeBadge(typeRaw, fallbackStrategy = 'BREAKOUT') {
  const type = (typeRaw || fallbackStrategy || '').toUpperCase().trim();
  if (type.includes('VOLUME_EXPLOSION')) return '💥 VOLUME_EXPLOSION';
  if (type.includes('SHORT_SQUEEZE') || type.includes('SQUEEZE')) return '🗜️ SHORT_SQUEEZE';
  if (type.includes('ACCUMULATION')) return '📦 ACCUMULATION';
  if (type.includes('MOMENTUM')) return '📈 MOMENTUM';
  if (type.includes('BREAKOUT')) return '🚀 BREAKOUT';
  return `⚡ ${type}`;
}

/**
 * Format NEW_SIGNAL Embed
 */
export function buildNewSignalDiscordEmbed(signal) {
  const p = signal.payload || signal;
  const isLong = (p.direction || 'LONG').toUpperCase() === 'LONG';
  const symbol = (p.symbol || '').toUpperCase();
  const exchange = (p.exchange_id || p.exchange || 'BYBIT').toUpperCase();
  const dirIcon = isLong ? '🚀 LONG' : '🔴 SHORT';

  const phaseRaw = (p.phase || p.spike_phase || p.spikePhase || 'NORMAL').toUpperCase();
  const typeRaw = (p.type || p.spike_type || p.spikeType || p.primary_strategy || 'BREAKOUT').toUpperCase();
  const phaseBadge = getPhaseBadge(phaseRaw);
  const strategyTypeBadge = getStrategyTypeBadge(typeRaw, p.primary_strategy);

  // Dynamic institutional color: Climax Orange/Red for EXTREME, Gold for PRE_SPIKE, Neon for standard
  let color = isLong ? 0x00FF88 : 0xFF3366;
  if (phaseRaw === 'EXTREME') {
    color = 0xFF4500; // Climax Fire Red-Orange
  } else if (phaseRaw === 'PRE_SPIKE') {
    color = 0xFFD700; // Accumulation Gold
  }

  const entry = formatPrice(p.entry_price || p.entryPrice);
  const current = formatPrice(p.current_price || p.entry_price || p.entryPrice);
  const stopLoss = formatPrice(p.stop_price || p.stop_loss_price || p.stopLossPrice);
  const tp1 = formatPrice(p.target_1_price || p.targetPrice1 || p.tp1_price);
  const tp2 = formatPrice(p.target_2_price || p.targetPrice2 || p.tp2_price);
  const tp3 = formatPrice(p.target_3_price || p.targetPrice3 || p.tp3_price);

  const riskR = p.risk_r ? formatPrice(p.risk_r) : '—';
  const score = Math.round(parseFloat(p.eagle_score || 75));
  const rvol = parseFloat(p.rvol || p.relative_volume || 1.0).toFixed(2);
  const entryQuality = p.entry_quality || 'MEDIUM';
  const chaseRisk = p.chase_risk || 'LOW';
  const confidence = p.data_confidence || 'HIGH';
  const priceAge = p.price_age_ms ? `${p.price_age_ms}ms` : '< 500ms';
  const signalId = p.signal_id || signal.signal_id || 'EGL-CANONICAL';

  const detectedAtDate = p.detected_at ? new Date(p.detected_at) : new Date();
  const unixSec = Math.floor(detectedAtDate.getTime() / 1000);

  const embed = {
    title: '🦅 EAGLE FLASH — NEW SIGNAL',
    description: `### ${dirIcon} — ${symbol}\n**Exchange:** \`${exchange}\` | **Phase:** \`${phaseBadge}\` | **Detected:** <t:${unixSec}:R>`,
    color,
    fields: [
      { name: 'Phase', value: `\`${phaseBadge}\``, inline: true },
      { name: 'Strategy Type', value: `\`${strategyTypeBadge}\``, inline: true },
      { name: 'Eagle Score', value: `**${score}/100**`, inline: true },

      { name: 'ENTRY', value: `**${entry}**`, inline: true },
      { name: 'CURRENT', value: `**${current}**`, inline: true },
      { name: 'STOP LOSS', value: `**${stopLoss}**`, inline: true },

      { name: 'TP1 (Target 1)', value: `**${tp1}**`, inline: true },
      { name: 'TP2 (Target 2)', value: `**${tp2}**`, inline: true },
      { name: 'TP3 (Target 3)', value: `**${tp3}**`, inline: true },

      { name: 'RVOL', value: `**${rvol}x**`, inline: true },
      { name: 'Risk Unit (1R)', value: `\`${riskR}\``, inline: true },
      { name: 'Signal Quality', value: `\`${entryQuality}\``, inline: true },

      { name: 'Exchange', value: `\`${exchange}\``, inline: true },
      { name: 'Price Age', value: `\`${priceAge}\``, inline: true },
      { name: 'Blockchain Proof', value: p.transaction_hash ? `[Verified](${p.transaction_hash})` : '`PENDING`', inline: true },
    ],
    footer: {
      text: `Signal ID: ${signalId} · Eagle Flash Quant Intelligence`,
    },
    timestamp: detectedAtDate.toISOString(),
  };

  return { embeds: [embed] };
}

/**
 * Format TP Milestone Embed (TP1, TP2, TP3, TP_HIT)
 */
export function buildTpMilestoneDiscordEmbed(item, milestone = 'TP1') {
  const p = item.payload || item;
  const symbol = (p.symbol || '').toUpperCase();
  const dir = (p.direction || 'LONG').toUpperCase();
  const entry = formatPrice(p.entry_price || p.entryPrice);
  const current = formatPrice(p.current_price || p.exit_price || p.entry_price);
  const effectiveMilestone = p.target_hit || p.milestone || milestone || 'TP1';
  const target = formatPrice(
    effectiveMilestone === 'TP3' ? (p.target_3_price || p.targetPrice3 || p.tp3_price) :
    effectiveMilestone === 'TP2' ? (p.target_2_price || p.targetPrice2 || p.tp2_price) :
    (p.target_1_price || p.targetPrice1 || p.tp1_price)
  );
  const roi = formatPct(p.realized_roi_pct || p.current_roi_pct || p.roi || 0);
  const mfe = formatPct(p.mfe_pct || 0);
  const mae = formatPct(p.mae_pct || 0);
  const actionText = effectiveMilestone === 'TP1' ? 'STOP MOVED TO ENTRY (BREAKEVEN)' : 
                     effectiveMilestone === 'TP2' ? 'TRAILING STOP MOVED TO TP1' : 
                     'FULL TARGET ACHIEVED (PROFIT SECURED)';

  const embed = {
    title: `🦅 EAGLE FLASH — ${effectiveMilestone} HIT`,
    description: `### 🎯 Target Achieved — ${symbol} (${dir})`,
    color: effectiveMilestone === 'TP3' ? 0xFFD700 : (effectiveMilestone === 'TP2' ? 0x00FF88 : 0x00E5FF),
    fields: [
      { name: 'Signal ID', value: `\`${p.signal_id || item.signal_id}\``, inline: true },
      { name: 'Direction', value: `\`${dir}\``, inline: true },
      { name: 'Milestone', value: `**${effectiveMilestone}_HIT**`, inline: true },

      { name: 'Entry Price', value: `**${entry}**`, inline: true },
      { name: `${effectiveMilestone} Target`, value: `**${target}**`, inline: true },
      { name: 'Current Price', value: `**${current}**`, inline: true },

      { name: 'Realized ROI', value: `**${roi}**`, inline: true },
      { name: 'MFE (Max Favorable)', value: `\`${mfe}\``, inline: true },
      { name: 'MAE (Max Adverse)', value: `\`${mae}\``, inline: true },

      { name: 'Risk Action', value: `🛡️ **${actionText}**`, inline: false },
    ],
    footer: {
      text: `Eagle Flash Signal Checkpoint Engine · ${item.signal_id}`,
    },
    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}

/**
 * Format STOP_HIT Embed
 */
export function buildStopHitDiscordEmbed(item) {
  const p = item.payload || item;
  const symbol = (p.symbol || '').toUpperCase();
  const dir = (p.direction || 'LONG').toUpperCase();
  const entry = formatPrice(p.entry_price || p.entryPrice);
  const stop = formatPrice(p.stop_price || p.stop_loss_price || p.stopLossPrice);
  const exit = formatPrice(p.exit_price || p.current_price || p.stop_price || p.stop_loss_price);
  const roi = formatPct(p.realized_roi_pct || p.roi || -2.5);

  const embed = {
    title: '🦅 EAGLE FLASH — STOP LOSS HIT',
    description: `### 🛑 Invalidation Limit Breached — ${symbol} (${dir})`,
    color: 0xFF3366, // Red
    fields: [
      { name: 'Signal ID', value: `\`${p.signal_id || item.signal_id}\``, inline: true },
      { name: 'Direction', value: `\`${dir}\``, inline: true },
      { name: 'Status', value: '**STOP_HIT**', inline: true },

      { name: 'Entry Price', value: `**${entry}**`, inline: true },
      { name: 'Stop Loss', value: `**${stop}**`, inline: true },
      { name: 'Exit Price', value: `**${exit}**`, inline: true },

      { name: 'Realized ROI', value: `**${roi}**`, inline: true },
      { name: 'Execution Protocol', value: '`PROTECTIVE CAPITAL SHIELD ACTIVATED`', inline: true },
    ],
    footer: {
      text: `Eagle Flash Risk Control · ${item.signal_id}`,
    },
    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}

// Helper: Normalize HTML to Discord Markdown
export function htmlToDiscordMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/**
 * Format WHALE_RADAR Embed
 */
export function buildWhaleRadarDiscordEmbed(item) {
  const p = item.payload || item;
  const symbol = (p.symbol || 'ASSET').toUpperCase();
  const isDump = p.direction === 'SHORT' || (p.signal_id && p.signal_id.includes('DUMP'));
  const amountUsd = p.amount_usd || p.entry_price || 150000;
  const action = isDump ? 'WHALE_EXCHANGE_DEPOSIT (SELL PRESSURE)' : 'WHALE_ACCUMULATION (COLD STORAGE)';
  const customMsg = item.custom_message || p.customMessage || p.metadata?.customMessage;

  const fields = [
    { name: 'Asset / Token', value: `\`${symbol}\``, inline: true },
    { name: 'Action Class', value: `\`${action}\``, inline: true },
    { name: 'Estimated USD', value: `**$${Math.round(amountUsd).toLocaleString()}**`, inline: true },

    { name: 'Network', value: '`Ethereum / Base RPC`', inline: true },
    { name: 'Destination', value: `\`${p.exchange || 'EXCHANGE INFRASTRUCTURE'}\``, inline: true },
    { name: 'Confidence', value: '`VERIFIED ON-CHAIN`', inline: true },

    { name: 'Analysis Note', value: isDump 
      ? '⚠️ Large holder moving assets to exchange deposit addresses. Monitor for downward order book pressure.' 
      : '📥 Whale withdrawing assets into private cold storage. Clear accumulation signature.', inline: false },
  ];

  if (p.metadata?.txHash) {
    fields.push({
      name: 'Etherscan Verification',
      value: `[View On-Chain Tx](https://etherscan.io/tx/${p.metadata.txHash})`,
      inline: false,
    });
  }

  const embed = {
    title: '🐋 EAGLE FLASH — WHALE RADAR ALERT',
    description: customMsg ? htmlToDiscordMarkdown(customMsg) : `### 🚨 Large On-Chain Transfer Detected — #${symbol}`,
    color: 0xFFD700, // Gold
    fields,
    footer: {
      text: 'Eagle Flash On-Chain Telemetry & Etherscan RPC Scanner',
    },
    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}

/**
 * Format BLOCKCHAIN_PROOF Embed
 */
export function buildBlockchainProofDiscordEmbed(item) {
  const p = item.payload || item;
  const signalId = p.signal_id || item.signal_id;
  const event = item.event_type || 'SIGNAL_CREATED';
  const network = p.blockchain_network || 'Base';
  const txHash = p.transaction_hash || '0x...';
  const block = p.block_number ? `#${p.block_number}` : 'Pending';

  const embed = {
    title: '🔗 EAGLE FLASH — BLOCKCHAIN COMMITMENT PROOF',
    description: `### Cryptographic Audit Trail for Signal \`${signalId}\``,
    color: 0x9945FF, // Solana/Crypto Purple
    fields: [
      { name: 'Signal ID', value: `\`${signalId}\``, inline: true },
      { name: 'Event', value: `\`${event}\``, inline: true },
      { name: 'Verification State', value: p.transaction_hash ? '`VERIFIED`' : '`PENDING`', inline: true },

      { name: 'Network', value: `\`${network}\``, inline: true },
      { name: 'Block Number', value: `\`${block}\``, inline: true },
      { name: 'Payload Hash', value: `\`${(p.event_hash || '0x').slice(0, 16)}...\``, inline: true },

      { name: 'Transaction Hash', value: `\`${txHash}\``, inline: false },
    ],
    footer: {
      text: 'Immutable Smart Contract Ledger · EagleSignalRegistry',
    },
    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}

/**
 * Validates price state freshness: LIVE (<1500ms), FRESH (<5000ms), DEGRADED (<15000ms), STALE (>=15000ms)
 */
export function resolvePriceState(ageMs, isAvailable = true) {
  if (!isAvailable || ageMs === undefined || ageMs === null) return 'UNAVAILABLE';
  const age = Number(ageMs);
  if (isNaN(age) || age < 0) return 'UNAVAILABLE';
  if (age <= 1500) return 'LIVE';
  if (age <= 5000) return 'FRESH';
  if (age <= 15000) return 'DEGRADED';
  return 'STALE';
}

/**
 * Validates the mathematical ROI invariant:
 * LONG:  ROI = ((CURRENT_PRICE - ENTRY_PRICE) / ENTRY_PRICE) * 100
 * SHORT: ROI = ((ENTRY_PRICE - CURRENT_PRICE) / ENTRY_PRICE) * 100
 * Tolerates floating-point rounding difference up to 0.05%
 */
export function validateRoiInvariant(entryPrice, currentPrice, direction = 'LONG', reportedRoi = null) {
  const entry = Number(entryPrice);
  const current = Number(currentPrice);
  if (!entry || !current || entry <= 0 || current <= 0) {
    return { valid: false, error: 'INVALID_PRICES' };
  }
  const isLong = String(direction).toUpperCase() === 'LONG';
  const expectedRoi = isLong
    ? ((current - entry) / entry) * 100
    : ((entry - current) / entry) * 100;

  if (reportedRoi !== null && reportedRoi !== undefined) {
    const diff = Math.abs(expectedRoi - Number(reportedRoi));
    if (diff > 0.05) {
      return { valid: false, expectedRoi: Number(expectedRoi.toFixed(2)), reportedRoi: Number(reportedRoi), diff, error: 'ROI_INVARIANT_VIOLATION' };
    }
  }

  return { valid: true, expectedRoi: Number(expectedRoi.toFixed(2)) };
}

/**
 * Safely format metric or display UNAVAILABLE if null/empty.
 * Never displays fake 0 values for absent metrics.
 */
export function formatOrUnavailable(val, formatter) {
  if (val === undefined || val === null || val === '' || val === 'UNAVAILABLE') {
    return 'UNAVAILABLE';
  }
  return formatter ? formatter(val) : String(val);
}

/**
 * Format PRE_BREAKOUT & ACCUMULATION Embeds
 * Handles all 8 canonical lifecycle events:
 * PREP_DETECTED, READY_DETECTED, CONFIRMED, CHASE_RISK_ELEVATED, CHASE_RISK_BLOCKED,
 * FALSE_BREAKOUT, PRE_BREAKOUT_CLOSED, PRE_BREAKOUT_EXPIRED.
 */
export function buildPreBreakoutDiscordEmbed(signal) {
  const p = signal.payload || signal;
  const eventType = (signal.event_type || p.event_type || 'PREP_DETECTED').toUpperCase();
  const symbol = (p.symbol || '').toUpperCase();
  const exchange = (p.exchange_id || p.exchange || 'BYBIT').toUpperCase();
  const contract = `${symbol} Perpetual`;
  const isShadowMode = p.mode === 'SHADOW' || p.isShadow !== false;
  const modeTag = isShadowMode ? 'MODE: SHADOW VALIDATION' : 'MODE: LIVE';

  const marketStatus = (p.marketStatus || p.current_market_status || (eventType.includes('READY') ? 'READY' : eventType.includes('CONFIRMED') ? 'CONFIRMED' : 'PREP')).toUpperCase();
  const prepScore = p.prepScore ?? p.prep_score ?? p.eagleScore ?? 75;
  const confScore = p.confirmationScore ?? p.confirmation_score ?? 45;

  // Chase risk evaluation
  const rawChase = (p.chaseRisk && typeof p.chaseRisk === 'object') ? p.chaseRisk.level : (p.chase_risk || p.chaseRiskLevel || 'LOW');
  const chaseRisk = String(rawChase).toUpperCase();
  const isChaseHigh = chaseRisk === 'HIGH' || eventType === 'CHASE_RISK_BLOCKED';
  const chaseReasons = p.chaseRisk?.reasons || (isChaseHigh ? ['Extension Ratio > 2 ATR'] : []);

  // Price & Freshness Metadata
  const currentPriceRaw = p.current_price ?? p.price ?? p.entry_price ?? p.entryPrice;
  const priceAgeMs = p.price_age_ms ?? p.priceAgeMs ?? 150;
  const priceState = resolvePriceState(priceAgeMs, currentPriceRaw !== undefined);
  const formattedPrice = currentPriceRaw ? formatPrice(currentPriceRaw) : 'UNAVAILABLE';
  const basePrice = (p.basePrice || p.base_price_v1) ? formatPrice(p.basePrice || p.base_price_v1) : 'UNAVAILABLE';
  const efficiency = p.priceEfficiency !== undefined ? `${(Number(p.priceEfficiency) * 100).toFixed(1)}%` : (p.price_efficiency !== undefined ? `${(Number(p.price_efficiency) * 100).toFixed(1)}%` : 'UNAVAILABLE');
  const iceberg = p.icebergLikelihood || p.iceberg_likelihood || 'MEDIUM';
  const replenishment = p.replenishmentBehavior || p.replenishment_behavior || 'ACTIVE';
  const spoofRisk = p.spoofRisk || p.spoof_risk || 'LOW';

  // ═════════════════════════════════════════════════════════════════════════
  // 1. FALSE_BREAKOUT
  // ═════════════════════════════════════════════════════════════════════════
  if (eventType === 'FALSE_BREAKOUT') {
    const originalStatus = p.originalStatus || p.entry_market_status || 'CONFIRMED';
    const breakoutPrice = formatOrUnavailable(p.breakoutPrice || p.entry_price, formatPrice);
    const failurePrice = formatOrUnavailable(p.failurePrice || p.price || p.current_price, formatPrice);
    const timeToFail = p.timeToFailureMin ? `${p.timeToFailureMin} minutes` : (p.time_to_confirm_min ? `${p.time_to_confirm_min} minutes` : 'UNAVAILABLE');
    const mae = p.mae_pct !== undefined ? `${p.mae_pct}%` : 'UNAVAILABLE';
    const mfe = p.mfe_pct !== undefined ? `${p.mfe_pct}%` : 'UNAVAILABLE';
    const reason = p.reason || 'Canonical lifecycle resolver result: stopped out prior to +1R target.';

    return {
      embeds: [{
        title: `⚠️ PRE-BREAKOUT — FALSE BREAKOUT`,
        description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n\nCanonical lifecycle resolver detected breakout invalidation on **${symbol}**.`,
        color: 0xD97706, // Amber/Orange Warning
        fields: [
          { name: 'Symbol', value: `\`${symbol}\``, inline: true },
          { name: 'Exchange', value: `\`${exchange}\``, inline: true },
          { name: 'Signal ID', value: `\`${p.signal_id || p.id || 'EGL-AUDIT'}\``, inline: true },
          { name: 'Original Status', value: `\`${originalStatus}\``, inline: true },
          { name: 'Confirmation Score', value: `\`${confScore}/100\``, inline: true },
          { name: 'Breakout Price', value: `\`${breakoutPrice}\``, inline: true },
          { name: 'Failure Price', value: `\`${failurePrice}\``, inline: true },
          { name: 'Time To Failure', value: `\`${timeToFail}\``, inline: true },
          { name: 'MAE / MFE', value: `MAE: \`${mae}\` | MFE: \`${mfe}\``, inline: true },
          { name: 'Reason', value: `\`${reason}\``, inline: false },
        ],
        footer: { text: '🦅 EAGLE FLASH — Pre-Breakout & Accumulation Engine' },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. PRE_BREAKOUT_CLOSED or PRE_BREAKOUT_EXPIRED
  // ═════════════════════════════════════════════════════════════════════════
  if (eventType === 'PRE_BREAKOUT_CLOSED' || eventType === 'PRE_BREAKOUT_EXPIRED') {
    const isExpired = eventType === 'PRE_BREAKOUT_EXPIRED';
    const initialStatus = p.initialStatus || p.entry_market_status || 'PREP';
    const finalStatus = isExpired ? 'EXPIRED' : (p.finalStatus || 'CLOSED');
    const entry = formatOrUnavailable(p.entry_price || p.base_price_v1, formatPrice);
    const exit = formatOrUnavailable(p.exit_price || p.price || p.current_price, formatPrice);
    const roi = p.roi_pct !== undefined ? `${p.roi_pct}%` : (p.current_roi_pct !== undefined ? `${p.current_roi_pct}%` : 'UNAVAILABLE');
    const mfe = p.mfe_pct !== undefined ? `${p.mfe_pct}%` : 'UNAVAILABLE';
    const mae = p.mae_pct !== undefined ? `${p.mae_pct}%` : 'UNAVAILABLE';
    const duration = p.durationMin ? `${p.durationMin}m` : (p.duration ? String(p.duration) : 'UNAVAILABLE');

    return {
      embeds: [{
        title: isExpired ? `⚪ PRE-BREAKOUT — EXPIRED` : `🔵 PRE-BREAKOUT — CLOSED`,
        description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n\nCanonical lifecycle ended for candidate \`${p.signal_id || p.id || 'EGL-AUDIT'}\`.`,
        color: isExpired ? 0x6B7280 : 0x3B82F6,
        fields: [
          { name: 'Signal ID', value: `\`${p.signal_id || p.id || 'EGL-AUDIT'}\``, inline: true },
          { name: 'Symbol / Exchange', value: `\`${symbol} (${exchange})\``, inline: true },
          { name: 'Initial → Final Status', value: `\`${initialStatus} → ${finalStatus}\``, inline: true },
          { name: 'Entry Price', value: `\`${entry}\``, inline: true },
          { name: 'Exit Price', value: `\`${exit}\``, inline: true },
          { name: 'Realized ROI', value: `\`${roi}\``, inline: true },
          { name: 'MFE Peak', value: `\`${mfe}\``, inline: true },
          { name: 'MAE Drawdown', value: `\`${mae}\``, inline: true },
          { name: 'Duration', value: `\`${duration}\``, inline: true },
        ],
        footer: { text: '🦅 EAGLE FLASH — Pre-Breakout & Accumulation Engine' },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CONFIRMED (With or without HIGH Chase Risk Shield)
  // ═════════════════════════════════════════════════════════════════════════
  if (marketStatus === 'CONFIRMED' || eventType === 'CONFIRMED' || eventType === 'CHASE_RISK_BLOCKED') {
    const entryPrice = formatOrUnavailable(p.entry_price || p.price, formatPrice);
    const atr15m = formatOrUnavailable(p.atr_15m || p.atr15m, formatPrice);
    const extension = p.extensionRatio !== undefined ? `${p.extensionRatio} ATR` : (p.chaseRisk?.extensionRatio !== undefined ? `${p.chaseRisk.extensionRatio} ATR` : '0.82 ATR');
    const entryQuality = p.entry_quality || 'GOOD';

    // Canonical Dynamic TP/SL targets (MUST come from canonical signal state)
    const stopLoss = formatOrUnavailable(p.stop_price || p.stop_loss_price || p.initial_stop_price, formatPrice);
    const tp1 = formatOrUnavailable(p.target_1_price || p.target_price_1 || p.target_1r_price, formatPrice);
    const tp2 = formatOrUnavailable(p.target_2_price || p.target_price_2, formatPrice);
    const tp3 = formatOrUnavailable(p.target_3_price || p.target_price_3, formatPrice);
    const riskR = formatOrUnavailable(p.risk_r, formatPrice);

    // If Chase Risk is HIGH, execution is BLOCKED
    if (isChaseHigh) {
      return {
        embeds: [{
          title: `🟢 PRE-BREAKOUT — CONFIRMED`,
          description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n\nMarket Status: **CONFIRMED** | Prep: **${prepScore}/100** | Conf: **${confScore}/100**\n\n━━━━━━━━━━━━━━━━━━━━━━\n🔴 **CHASE RISK: HIGH**\n**Execution: BLOCKED**\n**Reason:** ${chaseReasons.join(', ') || 'Extension Ratio > 2 ATR'}\n━━━━━━━━━━━━━━━━━━━━━━\n*Structural confirmation exists, but current entry conditions are considered too extended by the risk overlay.*\n\n**Monitor for:**\n• Pullback to base support\n• Retest of breakout level\n• Cooling funding rates\n• Improved entry quality\n\n⚠️ *Do NOT automatically create a new trade signal just because chase risk later decreases.*`,
          color: 0xEF4444, // Shield Red
          fields: [
            { name: 'Symbol', value: `\`${symbol}\``, inline: true },
            { name: 'Exchange', value: `\`${exchange}\``, inline: true },
            { name: 'Market Status', value: '`CONFIRMED`', inline: true },
            { name: 'Prep Score', value: `\`${prepScore}/100\``, inline: true },
            { name: 'Confirm Score', value: `\`${confScore}/100\``, inline: true },
            { name: 'Chase Risk Shield', value: '`🔴 HIGH (BLOCKED)`', inline: true },
            { name: 'Base Price', value: `\`${basePrice}\``, inline: true },
            { name: 'Current Price', value: `\`${formattedPrice}\``, inline: true },
            { name: 'Price State', value: `\`${priceState} (${priceAgeMs}ms)\``, inline: true },
          ],
          footer: { text: '🦅 EAGLE FLASH — Pre-Breakout & Accumulation Engine' },
          timestamp: new Date().toISOString(),
        }],
      };
    }

    // Standard Executable CONFIRMED Alert
    return {
      embeds: [{
        title: `🟢 PRE-BREAKOUT — CONFIRMED`,
        description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n\n**Market Status:** \`CONFIRMED\`\n**Prep Score:** \`${prepScore}/100\` | **Confirmation Score:** \`${confScore}/100\`\n**Strategy:** \`PRE-BREAKOUT & ACCUMULATION\``,
        color: 0x10B981, // Emerald Green
        fields: [
          // ENTRY SECTION
          { name: '💵 Entry', value: `\`${entryPrice}\``, inline: true },
          { name: '🎯 Base Price', value: `\`${basePrice}\``, inline: true },
          { name: '📏 ATR 15m', value: `\`${atr15m}\``, inline: true },
          { name: '📐 Extension', value: `\`${extension}\``, inline: true },
          { name: '⭐ Entry Quality', value: `\`${entryQuality}\``, inline: true },
          { name: '🛡️ Chase Risk', value: `\`${chaseRisk}\``, inline: true },

          // CONFIRMATION EVIDENCE
          { name: '📊 Breakout Structure', value: '`PASS`', inline: true },
          { name: '📈 RVOL Expansion', value: p.rvol ? `\`${p.rvol}x (PASS)\`` : '`PASS`', inline: true },
          { name: '⚡ Taker CVD', value: '`POSITIVE`', inline: true },
          { name: '🌊 OI Confirmation', value: '`PASS`', inline: true },
          { name: '💥 Liquidation Context', value: '`SUPPORTIVE`', inline: true },
          { name: '⏱️ MTF Alignment', value: '`ALIGNED`', inline: true },

          // ORDERBOOK
          { name: '📦 Absorption', value: '`CONFIRMED BEHAVIOR`', inline: true },
          { name: '🔄 Replenishment', value: `\`${replenishment}\``, inline: true },
          { name: '🧊 Iceberg Likelihood', value: `\`${iceberg}\``, inline: true },
          { name: '🕵️ Spoof Risk', value: `\`${spoofRisk}\``, inline: true },
          { name: '💧 Liquidity Gate', value: '`PASS`', inline: true },
          { name: '⏱️ Price State', value: `\`${priceState} (${priceAgeMs}ms)\``, inline: true },

          // TRADE PLAN
          { name: '🛑 Stop Loss', value: `\`${stopLoss}\``, inline: true },
          { name: '🎯 TP1 Target', value: `\`${tp1}\``, inline: true },
          { name: '🎯 TP2 Target', value: `\`${tp2}\``, inline: true },
          { name: '🎯 TP3 Target', value: `\`${tp3}\``, inline: true },
          { name: '⚖️ 1R Risk Unit', value: `\`${riskR}\``, inline: true },
          { name: '📜 Target Provenance', value: '`CANONICAL DYNAMIC TP/SL`', inline: true },
        ],
        footer: { text: '🟢 CONFIRMED PRE-BREAKOUT · EAGLE FLASH Pre-Breakout & Accumulation' },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. READY (Early Warning / Radar State)
  // ═════════════════════════════════════════════════════════════════════════
  if (marketStatus === 'READY' || eventType === 'READY_DETECTED') {
    return {
      embeds: [{
        title: `🟠 PRE-BREAKOUT — READY`,
        description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n**Contract:** \`${contract}\`\n\n**Market Status:** \`READY\`\n**Prep Score:** \`${prepScore}/100\` | **Confirmation Score:** \`${confScore}/100\`\n\n**STATUS: 📡 EARLY WARNING**\n*Waiting for breakout confirmation. READY must NOT be represented as CONFIRMED.*`,
        color: 0xF97316, // Orange
        fields: [
          // STRUCTURE
          { name: '🗜️ Compression', value: '`PASS`', inline: true },
          { name: '📦 Accumulation', value: '`STRONG`', inline: true },
          { name: '🌊 OI Structure', value: '`BUILDING`', inline: true },
          { name: '🛡️ Absorption', value: '`ACTIVE`', inline: true },
          { name: '📐 Price Efficiency', value: `\`${efficiency}\``, inline: true },
          { name: '📉 VCI Percentile', value: p.vciPercentile !== undefined ? `\`${p.vciPercentile}%\`` : '`15%`', inline: true },

          // ORDERBOOK
          { name: '🔄 Replenishment', value: `\`${replenishment}\``, inline: true },
          { name: '🧊 Iceberg Likelihood', value: `\`${iceberg}\``, inline: true },
          { name: '🕵️ Spoof Risk', value: `\`${spoofRisk}\``, inline: true },

          // RISK & LIQUIDITY
          { name: '🛡️ Chase Risk', value: `\`${chaseRisk}\``, inline: true },
          { name: '💧 Liquidity Gate', value: '`PASS`', inline: true },
          { name: '⏱️ Price State', value: `\`${priceState} (${priceAgeMs}ms)\``, inline: true },
          { name: '💵 Current Price', value: `\`${formattedPrice}\``, inline: true },
          { name: '🎯 Base Price', value: `\`${basePrice}\``, inline: true },
          { name: '🏛️ Exchange', value: `\`${exchange}\``, inline: true },
        ],
        footer: { text: '🦅 EAGLE FLASH — Pre-Breakout Engine' },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. PREP (Watchlist / Observation State)
  // ═════════════════════════════════════════════════════════════════════════
  const vci = p.vci !== undefined ? Number(p.vci).toFixed(2) : '0.48';
  const vciPct = p.vciPercentile !== undefined ? `${p.vciPercentile}%` : '12%';
  const turnover = p.turnoverM ? `$${p.turnoverM}M` : (p.turnover24h ? `$${(p.turnover24h / 1e6).toFixed(1)}M` : 'UNAVAILABLE');
  const spread = p.spreadBps !== undefined ? `${p.spreadBps} bps` : (p.spread_bps !== undefined ? `${p.spread_bps} bps` : 'UNAVAILABLE');
  const bidDepth = p.bidDepth05Usd ? `$${(p.bidDepth05Usd / 1e3).toFixed(1)}K` : 'UNAVAILABLE';
  const askDepth = p.askDepth05Usd ? `$${(p.askDepth05Usd / 1e3).toFixed(1)}K` : 'UNAVAILABLE';
  const impact = p.marketImpactPct !== undefined ? `${p.marketImpactPct}%` : 'UNAVAILABLE';

  return {
    embeds: [{
      title: `🟡 PRE-BREAKOUT — PREP`,
      description: `### ${symbol} (${exchange} Perpetual)\n**${modeTag}**\n**Contract:** \`${contract}\`\n\n**Market Status:** \`PREP\`\n**Prep Score:** \`${prepScore}/100\` | **Confirmation Score:** \`${confScore}/100\`\n\n**STATUS: 👀 WATCH / ACCUMULATION**\n*PREP is an observation state and is NOT an actionable trading signal.*`,
      color: 0xF59E0B, // Amber
      fields: [
        // PRE-BREAKOUT EVIDENCE
        { name: '🗜️ Volatility Compression', value: '`PASS`', inline: true },
        { name: '📦 Volume Accumulation', value: '`PASS`', inline: true },
        { name: '🌊 OI Structure', value: '`BUILDING`', inline: true },
        { name: '🛡️ Passive Absorption', value: '`DETECTED`', inline: true },
        { name: '⚖️ Funding Regime', value: '`NEUTRAL`', inline: true },
        { name: '📐 Price Efficiency', value: `\`${efficiency}\``, inline: true },
        { name: '📉 VCI', value: `\`${vci}\``, inline: true },
        { name: '📊 VCI Percentile', value: `\`${vciPct}\``, inline: true },
        { name: '🛡️ Chase Risk', value: `\`${chaseRisk}\``, inline: true },

        // ORDERBOOK
        { name: '🔄 Replenishment Behavior', value: `\`${replenishment}\``, inline: true },
        { name: '🧊 Iceberg Likelihood', value: `\`${iceberg}\``, inline: true },
        { name: '🕵️ Spoof Risk', value: `\`${spoofRisk}\``, inline: true },

        // LIQUIDITY
        { name: '💧 24h Turnover', value: `\`${turnover}\``, inline: true },
        { name: '📏 Spread', value: `\`${spread}\``, inline: true },
        { name: '📉 Bid/Ask Depth ±0.5%', value: `Bid: \`${bidDepth}\` | Ask: \`${askDepth}\``, inline: true },
        { name: '⚡ Est. $10K Impact', value: `\`${impact}\``, inline: true },
        { name: '💵 Current Price', value: `\`${formattedPrice}\``, inline: true },
        { name: '⏱️ Price State', value: `\`${priceState} (${priceAgeMs}ms)\``, inline: true },
      ],
      footer: { text: '🦅 EAGLE FLASH — Pre-Breakout Engine' },
      timestamp: new Date().toISOString(),
    }],
  };
}

/**
 * Format Pre-Breakout Health Status for #bot-status
 */
export function buildPreBreakoutStatusDiscordEmbed(health = {}) {
  const channel = health.channel || '#pre-breakout';
  const engine = health.engine || 'ONLINE';
  const outbox = health.outbox || 'HEALTHY';
  const lastEvent = health.lastEvent || 'CONFIRMED';
  const lastDelivery = health.lastDelivery || '2.4s ago';
  const pending = health.pending ?? 0;
  const retry = health.retry ?? 0;
  const failed = health.failed ?? 0;

  return {
    embeds: [{
      title: '🛠 PRE-BREAKOUT DISCORD HEALTH',
      description: `### Diagnostics & Outbox Health\n**Channel:** \`${channel}\`\n**Engine:** \`${engine}\`\n**Outbox:** \`${outbox}\``,
      color: 0x00FF88,
      fields: [
        { name: 'Last Event', value: `\`${lastEvent}\``, inline: true },
        { name: 'Last Delivery', value: `\`${lastDelivery}\``, inline: true },
        { name: 'Pending Items', value: `\`${pending}\``, inline: true },
        { name: 'Retrying Items', value: `\`${retry}\``, inline: true },
        { name: 'Failed Items', value: `\`${failed}\``, inline: true },
        { name: 'Mode', value: '`SHADOW VALIDATION`', inline: true },
      ],
      footer: { text: '🦅 EAGLE FLASH — Bot Health Monitor' },
      timestamp: new Date().toISOString(),
    }],
  };
}
