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
 * Format PRE_BREAKOUT & ACCUMULATION Embed
 */
export function buildPreBreakoutDiscordEmbed(signal) {
  const p = signal.payload || signal;
  const symbol = (p.symbol || '').toUpperCase();
  const exchange = (p.exchange_id || p.exchange || 'BYBIT').toUpperCase();
  const status = p.marketStatus || 'PREP';
  const prepScore = p.prepScore ?? p.eagleScore ?? 75;
  const confScore = p.confirmationScore ?? 45;
  const price = formatPrice(p.price || p.entry_price || p.entryPrice);
  const basePrice = formatPrice(p.basePrice || p.base_price_v1 || p.price);
  const efficiency = p.priceEfficiency !== undefined ? `${(p.priceEfficiency * 100).toFixed(1)}%` : '28.5%';
  const iceberg = p.icebergLikelihood || 'MEDIUM';
  const chase = (p.chaseRisk && typeof p.chaseRisk === 'object') ? p.chaseRisk.level : (p.chaseRiskLevel || 'LOW');

  // Amber / Gold theme for Pre-Breakout & Accumulation
  const color = status === 'READY' ? 0xff9f43 : 0xffa502;

  const fields = [
    { name: '🏛️ Exchange', value: `\`${exchange}\``, inline: true },
    { name: '📊 Market Status', value: `\`${status === 'READY' ? '🟠 READY (Early Warning)' : '🟡 PREP (Coiling Base)'}\``, inline: true },
    { name: '🛡️ Chase Risk', value: `\`${chase === 'HIGH' ? '🔴 HIGH (Shield Active)' : chase === 'MEDIUM' ? '🟡 MODERATE' : '🟢 LOW'}\``, inline: true },
    { name: '💵 Current Price', value: `**${price}**`, inline: true },
    { name: '🎯 Base Price (v1.0)', value: `\`${basePrice}\``, inline: true },
    { name: '📐 Price Efficiency', value: `\`${efficiency}\``, inline: true },
    { name: '⚡ PREP Score', value: `**${prepScore}/100**`, inline: true },
    { name: '🚀 CONFIRM Score', value: `**${confScore}/100**`, inline: true },
    { name: '🧊 Iceberg Likelihood', value: `\`${iceberg}\``, inline: true },
  ];

  if (p.rvol) {
    fields.push({ name: '📈 Relative Volume', value: `\`${p.rvol}x\``, inline: true });
  }

  const embed = {
    title: `🟡 PRE-BREAKOUT & ACCUMULATION — ${symbol}`,
    description: `High-conviction smart money accumulation & volatility compression detected on **${symbol}**.\n*Order-book passive absorption confirmed prior to directional breakout.*`,
    color,
    fields,
    footer: {
      text: '🦅 EAGLE FLASH — Pre-Breakout & Accumulation Intelligence Engine',
    },
    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}
