/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — STRICT DISCORD EVENT & CHANNEL ROUTING ENGINE
 * Enforces dedicated channel separation:
 * - Whale Alerts / On-Chain Dumps -> #whale-alerts
 * - Quick Pumps / Volume Explosions / Extreme -> #quick-pump
 * - Breakouts -> #breakouts
 * - Squeezes / Accumulation / Pre-Spike -> #squeezes
 * - Big-Cap Desk (BTC, ETH, SOL) -> #big-cap
 * - Take-Profit Hits -> #tp-hits
 * - Stop-Loss Hits -> #stop-loss
 * - Blockchain Proofs -> #blockchain-proof
 * - Bot Status -> #bot-status
 * - General Standard Signals (Fallback) -> #signals
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function getWhaleChannel() {
  return process.env.DISCORD_CHANNEL_WHALE_ALERTS || process.env.DISCORD_CHANNEL_WHALES || null;
}

export function getTpHitsChannel() {
  return process.env.DISCORD_CHANNEL_TP_HITS || null;
}

export function getStopLossChannel() {
  return process.env.DISCORD_CHANNEL_STOP_LOSS || null;
}

export function getBlockchainProofChannel() {
  return process.env.DISCORD_CHANNEL_BLOCKCHAIN_PROOF || null;
}

export function getBotStatusChannel() {
  return process.env.DISCORD_CHANNEL_BOT_STATUS || null;
}

export function getBigCapChannel() {
  return process.env.DISCORD_CHANNEL_BIG_CAP || null;
}

export function getQuickPumpChannel() {
  return process.env.DISCORD_CHANNEL_QUICK_PUMP || null;
}

export function getBreakoutsChannel() {
  return process.env.DISCORD_CHANNEL_BREAKOUTS || null;
}

export function getSqueezesChannel() {
  return process.env.DISCORD_CHANNEL_SQUEEZES || null;
}

export function getSignalsChannel() {
  return process.env.DISCORD_CHANNEL_SIGNALS || null;
}

export function getPreBreakoutChannel() {
  return process.env.DISCORD_PREBREAKOUT_CHANNEL_ID || process.env.DISCORD_CHANNEL_PRE_BREAKOUT || null;
}

export function getMarketAlertsChannel() {
  return process.env.DISCORD_CHANNEL_MARKET_ALERTS || null;
}

export function getNewListingsChannel() {
  return (
    process.env.DISCORD_CHANNEL_NEW_LISTINGS ||
    process.env.DISCORD_NEW_LISTINGS_CHANNEL_ID ||
    process.env.DISCORD_CHANNEL_MARKET_ALERTS ||
    null
  );
}

/**
 * Strictly routes Pre-Breakout & Accumulation strategy lifecycle events to #pre-breakout:
 * PREP_DETECTED, READY_DETECTED, CONFIRMED, CHASE_RISK_ELEVATED, CHASE_RISK_BLOCKED,
 * FALSE_BREAKOUT, PRE_BREAKOUT_CLOSED, PRE_BREAKOUT_EXPIRED.
 *
 * @param {object|string} event - Event object or event_type string
 * @returns {string|null} - Discord Pre-Breakout Channel ID
 */
export function routePreBreakoutEvent(event) {
  return getPreBreakoutChannel();
}

/**
 * Resolves the single authoritative dedicated Discord channel for an event/signal item.
 * NEVER blindly routes specialized alerts or sub-categorized signals to #signals.
 *
 * @param {object} item - Outbox item with event_type and payload
 * @returns {string|null} - Discord Channel ID
 */
export function resolveDiscordChannel(item) {
  if (!item) return getSignalsChannel();

  const p = item.payload || item;
  const eventType = (item.event_type || p.event_type || 'NEW_SIGNAL').toUpperCase();
  const symbol = (p.symbol || '').toUpperCase().replace(/[-_]/g, '');
  const phase = (p.phase || p.spike_phase || p.spikePhase || '').toUpperCase();
  const type = (p.type || p.spike_type || p.spikeType || p.primary_strategy || '').toUpperCase();
  const signalId = (p.signal_id || item.signal_id || '').toUpperCase();
  const actionClass = (p.action || p.actionClass || p.whaleAction || '').toUpperCase();

  // 0. New Coin Listings & Market Alerts (#new-listing-alert or #market-alerts)
  const isNewListing = Boolean(
    eventType === 'NEW_COIN_LISTED' ||
    eventType === 'NEW_LISTING' ||
    eventType === 'LISTING_ALERT' ||
    eventType === 'NEW_PAIR' ||
    eventType === 'TOKEN_LISTED' ||
    signalId.startsWith('LISTING_') ||
    type.includes('NEW_LISTING') ||
    type.includes('LISTING')
  );
  if (isNewListing) {
    return getNewListingsChannel() || getMarketAlertsChannel() || getSignalsChannel();
  }

  const isMarketAlert = Boolean(
    eventType === 'MARKET_ALERT' ||
    eventType === 'REGIME_SHIFT' ||
    eventType === 'VOLATILITY_ALERT' ||
    type.includes('MARKET_ALERT')
  );
  if (isMarketAlert) {
    return getMarketAlertsChannel() || getSignalsChannel();
  }

  // 1. Whale Alerts / On-Chain Dumps / Etherscan Scans
  // (WHALE_ACCUMULATION, PUMP_AND_DUMP_RISK, WHALE_EXCHANGE_DEPOSIT, WHALE_ALERT, ONCHAIN_WHALE_ALERT)
  const isWhale = Boolean(
    eventType === 'WHALE_ALERT' ||
    eventType === 'WHALE_EVENT' ||
    eventType === 'ONCHAIN_WHALE_ALERT' ||
    signalId.startsWith('WHALE_') ||
    signalId.startsWith('ONCHAIN_') ||
    type.includes('WHALE') ||
    type.includes('PUMP_AND_DUMP') ||
    actionClass.includes('WHALE') ||
    actionClass.includes('DEPOSIT') ||
    actionClass.includes('ACCUMULATION')
  );
  if (isWhale) {
    return getWhaleChannel() || getSignalsChannel();
  }

  // 2. Take-Profit Hits (TP_HIT, TP1_HIT, TP2_HIT, TP3_HIT, T1_HIT, etc.)
  if (
    eventType.startsWith('TP') ||
    eventType.includes('TP_HIT') ||
    eventType.startsWith('T1_') ||
    eventType.startsWith('T2_') ||
    eventType.startsWith('T3_')
  ) {
    return getTpHitsChannel() || getSignalsChannel();
  }

  // 3. Stop-Loss Hits (SL_HIT, STOP_HIT, STOP_LOSS)
  if (
    eventType === 'SL_HIT' ||
    eventType === 'STOP_HIT' ||
    eventType.includes('STOP_LOSS')
  ) {
    return getStopLossChannel() || getSignalsChannel();
  }

  // 4. Blockchain Proof & Cryptographic Commitments
  if (eventType === 'BLOCKCHAIN_PROOF' || eventType === 'BLOCKCHAIN_COMMITMENT') {
    return getBlockchainProofChannel() || getSignalsChannel();
  }

  // 5. Bot Status & Diagnostics Heartbeat
  if (eventType === 'BOT_STATUS') {
    return getBotStatusChannel() || getSignalsChannel();
  }

  // 6. Big-Cap Desks (BTCUSDT, ETHUSDT, SOLUSDT)
  const isBigCap = Boolean(p.isBigCap || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(symbol));
  if (isBigCap) {
    const bigCapChan = getBigCapChannel();
    if (bigCapChan) return bigCapChan;
  }

  // 7. Quick Pumps / Volume Explosions / Extreme Phase Signals (VOLUME_EXPLOSION, EXTREME)
  const isQuickPump = Boolean(
    type.includes('VOLUME_EXPLOSION') ||
    phase === 'EXTREME' ||
    type.includes('PUMP')
  );
  if (isQuickPump) {
    const pumpChan = getQuickPumpChannel();
    if (pumpChan) return pumpChan;
  }

  // 8. Pre-Breakout & Accumulation Strategy Events (PREP_DETECTED, READY_DETECTED, CONFIRMED, CHASE, FALSE_BO, etc.)
  const isPreBreakout = Boolean(
    eventType === 'PREP_DETECTED' ||
    eventType === 'READY_DETECTED' ||
    eventType === 'PREP' ||
    eventType === 'READY' ||
    eventType === 'CHASE_RISK_ELEVATED' ||
    eventType === 'CHASE_RISK_BLOCKED' ||
    eventType === 'FALSE_BREAKOUT' ||
    eventType === 'PRE_BREAKOUT_CLOSED' ||
    eventType === 'PRE_BREAKOUT_EXPIRED' ||
    eventType === 'PRE_BREAKOUT' ||
    eventType === 'ACCUMULATION' ||
    p.marketStatus === 'PREP' ||
    p.marketStatus === 'READY' ||
    (eventType === 'CONFIRMED' && (type.includes('PRE_BREAKOUT') || type.includes('ACCUMULATION') || p.strategy === 'PRE_BREAKOUT' || p.strategy === 'PRE-BREAKOUT & ACCUMULATION' || p.prep_score !== undefined || p.prepScore !== undefined)) ||
    type.includes('PRE_BREAKOUT') ||
    type.includes('ACCUMULATION') ||
    phase === 'PRE_SPIKE'
  );
  if (isPreBreakout) {
    const preBreakoutChan = getPreBreakoutChannel();
    if (preBreakoutChan) return preBreakoutChan;
    const squeezeChan = getSqueezesChannel();
    if (squeezeChan) return squeezeChan;
  }

  // 9. Standard Breakouts (BREAKOUT)
  const isBreakout = Boolean(type.includes('BREAKOUT'));
  if (isBreakout) {
    const breakoutChan = getBreakoutsChannel();
    if (breakoutChan) return breakoutChan;
  }

  // 10. Squeezes (LONG_SQUEEZE, SHORT_SQUEEZE)
  const isSqueeze = Boolean(type.includes('SQUEEZE'));
  if (isSqueeze) {
    const squeezeChan = getSqueezesChannel();
    if (squeezeChan) return squeezeChan;
  }

  // 11. General Standard Signals (Fallback ONLY if no specific sub-category matches)
  return getSignalsChannel();
}

/**
 * Resolves destination channel array for Discord dispatcher.
 * Adheres strictly to single dedicated channel separation.
 *
 * @param {object} item
 * @returns {string[]}
 */
export function resolveDiscordChannels(item) {
  const primaryChannel = resolveDiscordChannel(item);
  return primaryChannel ? [primaryChannel] : [];
}
