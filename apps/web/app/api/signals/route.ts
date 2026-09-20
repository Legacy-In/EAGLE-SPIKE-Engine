import { NextRequest, NextResponse } from 'next/server';
import { spikeEventStore } from '@sigma/services/spike-intelligence/event-store';
import { SIGNAL_MODEL_CONFIG } from '@sigma/services/spike-intelligence/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange') || undefined;
    const direction = searchParams.get('direction') || undefined;
    const type = searchParams.get('type') || undefined;
    const quality = searchParams.get('quality') || undefined;
    const lifecycle = searchParams.get('lifecycle') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const isContextOnly = searchParams.get('context') === 'true';
    const isNearestOnly = searchParams.get('nearest') === 'true';

    // Market context calculation
    const allEvents = spikeEventStore.queryEvents({ limit: 200 });
    const btcEvent = allEvents.find(e => e.symbol === 'BTCUSDT');
    const btcRegime = btcEvent?.btcRegime || 'NEUTRAL';

    const marketContext = {
      btcRegime,
      breadthPct: btcEvent?.marketBreadthPct || 54,
      volumeRegime: allEvents.length > 20 ? 'EXTREME' : allEvents.length > 8 ? 'ELEVATED' : 'NORMAL',
      marketVolatility: btcRegime === 'HIGH_VOLATILITY' ? 'EXTREME' : 'NORMAL',
      signalEnvironment: allEvents.length > 15 ? 'ACTIVE' : allEvents.length > 5 ? 'SELECTIVE' : 'LOW OPPORTUNITY',
      dataHealth: 'HEALTHY',
      modelVersion: SIGNAL_MODEL_CONFIG.version,
      timestamp: Date.now()
    };

    if (isContextOnly) {
      return NextResponse.json({ success: true, context: marketContext });
    }

    // Filter confirmed signals
    let confirmedSignals = allEvents.filter(e => {
      if (exchange && e.exchange !== exchange) return false;
      if (direction && direction !== 'ALL') {
        const isLong = e.returns['5m'] >= 0;
        if (direction === 'LONG' && !isLong) return false;
        if (direction === 'SHORT' && isLong) return false;
      }
      if (type && type !== 'ALL' && e.spikeType !== type) return false;
      if (quality && quality !== 'ALL' && e.spikeQuality !== quality) return false;
      if (lifecycle && lifecycle !== 'ALL' && e.spikePhase !== lifecycle) return false;
      return e.eagleScore >= 70;
    });

    // Nearest candidates fallback if 0 or few confirmed
    const nearestCandidates = allEvents
      .filter(e => e.eagleScore >= 55 && e.eagleScore < 70)
      .slice(0, 8)
      .map(e => {
        const missing: string[] = [];
        if (e.rvol['5m'] < SIGNAL_MODEL_CONFIG.thresholds.rvolTrigger) missing.push('RVOL confirmation (< 2.0x)');
        if (Math.abs(e.orderFlow.takerImbalancePct) < 15) missing.push('Taker order flow dominance');
        if (e.derivatives.oiChange15mPct < 2.0) missing.push('Open interest expansion (< +2%)');
        if (e.orderBook.spreadBps > 15) missing.push('Order book liquidity / tight spread');

        return {
          symbol: e.symbol,
          exchange: e.exchange,
          price: e.price,
          eagleScore: e.eagleScore,
          spikePhase: e.spikePhase,
          dataConfidence: e.dataConfidence,
          missingConfirmations: missing.length > 0 ? missing : ['Multi-timeframe momentum alignment']
        };
      });

    if (isNearestOnly) {
      return NextResponse.json({
        success: true,
        count: nearestCandidates.length,
        nearestCandidates
      });
    }

    return NextResponse.json({
      success: true,
      context: marketContext,
      count: confirmedSignals.length,
      signals: confirmedSignals.slice(0, limit),
      nearestCandidates: confirmedSignals.length === 0 ? nearestCandidates : undefined
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query signals' },
      { status: 500 }
    );
  }
}
