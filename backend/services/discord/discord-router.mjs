/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD EVENT & CHANNEL ROUTER
 * Directs trade signals, strategy sub-types, milestones, whale telemetry,
 * and blockchain proofs to configured Discord channel destinations.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function resolveDiscordChannel(item) {
  const p = item.payload || item;
  const eventType = item.event_type || 'NEW_SIGNAL';
  const strategy = (p.primary_strategy || p.spike_type || '').toUpperCase();
  const isBigCap = Boolean(p.isBigCap || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(p.symbol));

  // 1. Channel Overrides via Item
  if (item.channel_id && item.channel_id !== 'DEFAULT') {
    return item.channel_id;
  }

  // 2. Specific Event Routing
  switch (eventType) {
    case 'TP1_HIT':
    case 'TP2_HIT':
    case 'TP3_HIT':
      return process.env.DISCORD_CHANNEL_TP_HITS || process.env.DISCORD_CHANNEL_SIGNALS || null;

    case 'STOP_HIT':
      return process.env.DISCORD_CHANNEL_STOP_LOSS || process.env.DISCORD_CHANNEL_SIGNALS || null;

    case 'WHALE_ALERT':
    case 'WHALE_EVENT':
    case 'ONCHAIN_WHALE_ALERT':
      return process.env.DISCORD_CHANNEL_WHALES || process.env.DISCORD_CHANNEL_SIGNALS || null;

    case 'BLOCKCHAIN_PROOF':
    case 'BLOCKCHAIN_COMMITMENT':
      return process.env.DISCORD_CHANNEL_BLOCKCHAIN_PROOF || process.env.DISCORD_CHANNEL_SIGNALS || null;

    case 'BOT_STATUS':
      return process.env.DISCORD_CHANNEL_BOT_STATUS || process.env.DISCORD_CHANNEL_SIGNALS || null;

    case 'NEW_SIGNAL':
    default:
      // Route by strategy / asset tier if configured
      if (isBigCap && process.env.DISCORD_CHANNEL_BIG_CAP) {
        return process.env.DISCORD_CHANNEL_BIG_CAP;
      }
      if (strategy.includes('PUMP') && process.env.DISCORD_CHANNEL_QUICK_PUMP) {
        return process.env.DISCORD_CHANNEL_QUICK_PUMP;
      }
      if (strategy.includes('BREAKOUT') && process.env.DISCORD_CHANNEL_BREAKOUTS) {
        return process.env.DISCORD_CHANNEL_BREAKOUTS;
      }
      if (strategy.includes('SQUEEZE') && process.env.DISCORD_CHANNEL_SQUEEZES) {
        return process.env.DISCORD_CHANNEL_SQUEEZES;
      }
      return process.env.DISCORD_CHANNEL_SIGNALS || null;
  }
}
