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
  return process.env.DISCORD_CHANNEL_PRE_BREAKOUT || null;
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

  // 8. Breakouts (BREAKOUT)
  const isBreakout = Boolean(type.includes('BREAKOUT'));
  if (isBreakout) {
    const breakoutChan = getBreakoutsChannel();
    if (breakoutChan) return breakoutChan;
  }

  // 9. Pre-Breakout & Accumulation (PREP, READY, ACCUMULATION, PRE_SPIKE, PRE_BREAKOUT)
  const isPreBreakout = Boolean(
    eventType === 'PRE_BREAKOUT' ||
    eventType === 'ACCUMULATION' ||
    p.marketStatus === 'PREP' ||
    p.marketStatus === 'READY' ||
    type.includes('ACCUMULATION') ||
    phase === 'PRE_SPIKE' ||
    type.includes('PRE_BREAKOUT')
  );
  if (isPreBreakout) {
    const preBreakoutChan = getPreBreakoutChannel();
    if (preBreakoutChan) return preBreakoutChan;
    const squeezeChan = getSqueezesChannel();
    if (squeezeChan) return squeezeChan;
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
