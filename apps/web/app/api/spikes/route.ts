import { NextRequest, NextResponse } from 'next/server';
import { spikeEventStore } from '@sigma/services/spike-intelligence/event-store';
import { alertDispatcher } from '@sigma/services/telegram/alert-dispatcher';
import { SpikeEventRecord, TelegramAlertPayload } from '@sigma/services/spike-intelligence/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || undefined;
    const exchange = searchParams.get('exchange') || undefined;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const phase = searchParams.get('phase') || undefined;
    const type = searchParams.get('type') || undefined;
    const quality = searchParams.get('quality') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const analyticsOnly = searchParams.get('analytics') === 'true';

    if (analyticsOnly) {
      const analytics = spikeEventStore.getAnalytics({ minScore, quality });
      return NextResponse.json({ success: true, analytics });
    }

    const events = spikeEventStore.queryEvents({
      symbol,
      exchange,
      minScore,
      phase,
      type,
      quality,
      limit,
    });

    const analytics = spikeEventStore.getAnalytics({ minScore, quality });

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
      analytics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query spike events' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ success: false, error: 'Request body required' }, { status: 400 });
    }

    // Support both single event and batch arrays
    const rawItems: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body.signals)
      ? body.signals
      : Array.isArray(body.events)
      ? body.events
      : [body];

    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No signals found in request' }, { status: 400 });
    }

    const recordedEvents: SpikeEventRecord[] = [];
    let dispatchedCount = 0;

    for (const item of rawItems) {
      const symbol = item.symbol;
      const price = parseFloat(item.price || item.signalPrice || item.lastPrice || 0);
      if (!symbol || !price) continue;

      const score = Math.round(parseFloat(item.eagleScore || item.signalScore || item.score || 70));
      const returns5m = parseFloat(item.returns5m || item.returns?.['5m'] || 0);
      const returns15m = parseFloat(item.returns15m || item.returns?.['15m'] || 0);
      const returns1h = parseFloat(item.returns1h || item.returns?.['1h'] || 0);
      const rvol = parseFloat(item.rvol || item.relativeVolume || item.rvol?.['5m'] || 1.0);
      const volumeZ = parseFloat(item.volumeZ || item.volumeZScore || 0);
      const oiUsd = parseFloat(item.openInterestUsd || item.openInterest || item.derivatives?.openInterestUsd || 0);
      const oiChangePct = parseFloat(item.oiChangePct || item.derivatives?.oiChange15mPct || 0);
      const takerFlow = parseFloat(item.takerFlow || item.takerFlowPct || item.takerImbalance || 0);

      // Normalize SpikeEventRecord
      const eventRecord: SpikeEventRecord = {
        eventId: item.eventId || item.signalId || `EVT-${Date.now()}-${symbol}`,
        symbol,
        exchange: item.exchange || 'BYBIT',
        timestamp: item.timestamp || item.detectedAt || Date.now(),
        price,
        returns: {
          '5m': returns5m,
          '15m': returns15m,
          '1h': returns1h,
          '24h': parseFloat(item.price24hChange || item.change24h || 0),
        },
        rvol: {
          '5m': rvol,
          '15m': rvol,
        },
        volumeZScore: volumeZ,
        tradeCountAcceleration: parseFloat(item.tradeCountAcceleration || 0),
        orderFlow: {
          takerBuyVolumeUsd: 0,
          takerSellVolumeUsd: 0,
          takerImbalancePct: takerFlow,
          cvdDeltaUsd: 0,
          flowDominance: takerFlow > 15 ? 'STRONG_BUY' : takerFlow < -15 ? 'STRONG_SELL' : 'BALANCED',
        },
        derivatives: {
          openInterestUsd: oiUsd,
          oiChange15mPct: oiChangePct,
          oiChange1hPct: oiChangePct,
          oiStructure: oiChangePct > 2 ? 'NEW_POSITIONING' : 'NEUTRAL',
          fundingRate: parseFloat(item.fundingRate || 0),
          fundingState: 'NORMAL',
          estimatedLongLiquidationsUsd: 0,
          estimatedShortLiquidationsUsd: 0,
          liquidationDominance: 'BALANCED',
        },
        orderBook: {
          bestBid: price * 0.9999,
          bestAsk: price * 1.0001,
          midPrice: price,
          spreadBps: 1,
          bidDepth01PctUsd: 50000,
          askDepth01PctUsd: 50000,
          bidDepth05PctUsd: 250000,
          askDepth05PctUsd: 250000,
          bidDepth1PctUsd: 500000,
          askDepth1PctUsd: 500000,
          depthImbalance: 0,
          largeBidWallDetected: false,
          largeAskWallDetected: false,
          lastUpdated: Date.now(),
        },
        btcRegime: item.btcRegime || 'NEUTRAL',
        marketBreadthPct: 54,
        eagleScore: score,
        scoreBreakdown: item.scoreBreakdown || {
          volumeAnomaly: Math.round(score * 0.25),
          volatilityCompressionExpansion: Math.round(score * 0.15),
          orderFlowDominance: Math.round(score * 0.15),
          openInterestAggression: Math.round(score * 0.15),
          orderBookLiquidityImbalance: Math.round(score * 0.1),
          marketRegimeAlignment: Math.round(score * 0.1),
          multiTimeframeConfluence: Math.round(score * 0.05),
          dataHealthPenalty: 0,
        },
        dataConfidence: item.dataConfidence || 95,
        spikePhase: item.spikePhase || (returns5m >= 0 ? 'ACCELERATION' : 'BREAKDOWN'),
        spikeType: item.spikeType || 'MOMENTUM',
        spikeQuality: item.spikeQuality || (score >= 80 ? 'HIGH' : score >= 65 ? 'MEDIUM' : 'LOW'),
        triggerReasons: item.triggerReasons || [
          `Eagle Score: ${score}/100`,
          `RVOL: ${rvol.toFixed(1)}x baseline`,
          `5M Return: ${returns5m >= 0 ? '+' : ''}${returns5m.toFixed(2)}%`,
        ],
        riskFlags: item.riskFlags || [],
        scoreVersion: 'score_v2.1.0',
        featureVersion: 'v2.1.0',
        alertSent: false,
        forwardReturns: item.forwardReturns || {},
        mfePct: item.extremes?.mfePct ?? item.mfePct ?? null,
        maePct: item.extremes?.maePct ?? item.maePct ?? null,
        outcomeClassification: item.outcomeClassification || 'PENDING',
      };

      const recorded = spikeEventStore.recordEvent(eventRecord);
      recordedEvents.push(recorded);

      // Auto-dispatch alert if high-confidence (Score >= 70 or forceAlert)
      if (score >= 70 || body.forceAlert) {
        const payload: TelegramAlertPayload = {
          eventId: recorded.eventId,
          symbol: recorded.symbol,
          eventType: 'SPIKE_DETECTED',
          state: recorded.spikePhase,
          price: recorded.price,
          returns5m: recorded.returns['5m'] || 0,
          returns15m: recorded.returns['15m'] || 0,
          returns1h: recorded.returns['1h'] || 0,
          rvol: recorded.rvol['5m'] || 1.0,
          volumeZ: recorded.volumeZScore || 0,
          openInterestUsd: recorded.derivatives.openInterestUsd,
          oiChangePct: recorded.derivatives.oiChange15mPct,
          takerFlowPct: recorded.orderFlow.takerImbalancePct,
          rsi: 50,
          eagleScore: recorded.eagleScore,
          spikeType: recorded.spikeType,
          spikeQuality: recorded.spikeQuality,
          dataConfidence: recorded.dataConfidence,
          btcRegime: recorded.btcRegime,
          triggerReasons: recorded.triggerReasons,
          timestamp: recorded.timestamp,
          cooldownSeconds: body.forceAlert ? 5 : 20 * 60,
        };

        // Fire alert in background (non-blocking)
        alertDispatcher
          .dispatchAlert(undefined, payload, { force: !!body.forceAlert })
          .then((dispatched) => {
            if (dispatched) dispatchedCount++;
          })
          .catch((err) => {
            console.error('Failed to dispatch alert to Telegram:', err?.message);
          });
      }
    }

    return NextResponse.json({
      success: true,
      count: recordedEvents.length,
      events: recordedEvents.slice(0, 10),
      message: `Processed ${recordedEvents.length} signals. Alerts queued for channel dispatch.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to record event' }, { status: 500 });
  }
}
