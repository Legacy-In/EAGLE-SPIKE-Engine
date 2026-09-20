import { NextRequest, NextResponse } from 'next/server';
import { AnomalyEngine } from '@sigma/services/spike-intelligence/anomaly-engine';
import { spikeEventStore } from '@sigma/services/spike-intelligence/event-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '15m';
    const exchange = searchParams.get('exchange') || 'ALL';
    const sector = searchParams.get('sector') || 'ALL';
    const metric = searchParams.get('metric') || 'ANOMALY_SCORE';
    const isClustersOnly = searchParams.get('clusters') === 'true';
    const isBreadthOnly = searchParams.get('breadth') === 'true';

    // Retrieve active events from event store
    const events = spikeEventStore.queryEvents({ limit: 300 });

    // Map events into symbols data format for AnomalyEngine
    const symbolsData = events.map(e => ({
      symbol: e.symbol,
      exchange: e.exchange,
      price24hChange: e.returns['24h'] || 0,
      returns1m: e.returns['1m'],
      returns5m: e.returns['5m'],
      returns15m: e.returns['15m'],
      returns1h: e.returns['1h'],
      relativeVolume: e.rvol['5m'] || 1.0,
      volumeZScore: e.volumeZScore || 0,
      turnover24h: 1500000,
      spreadPct: (e.orderBook?.spreadBps || 5) / 100,
      takerImbalance: e.orderFlow?.takerImbalancePct || 0,
      oiChangePct: e.derivatives?.oiChange15mPct || 0,
      signalScore: e.eagleScore,
      spikePhase: e.spikePhase,
      spikeType: e.spikeType,
      spikeQuality: e.spikeQuality,
      dataConfidence: e.dataConfidence,
      lastUpdated: e.timestamp
    }));

    // Compute Market Breadth
    const breadth = AnomalyEngine.calculateMarketBreadth(symbolsData, 'NEUTRAL');
    if (isBreadthOnly) {
      return NextResponse.json({ success: true, breadth });
    }

    // Compute Multi-Dimensional Anomalies
    let anomalies = AnomalyEngine.calculateAnomalies(symbolsData, timeframe);

    // Compute Correlated Spike Clusters
    const clusters = AnomalyEngine.detectSpikeClusters(anomalies);
    if (isClustersOnly) {
      return NextResponse.json({ success: true, count: clusters.length, clusters });
    }

    // Apply Filters
    if (exchange !== 'ALL') {
      anomalies = anomalies.filter(a => a.exchange === exchange);
    }
    if (sector !== 'ALL') {
      anomalies = anomalies.filter(a => a.sector === sector);
    }

    // Sort Anomalies based on selected metric
    anomalies.sort((a, b) => {
      if (metric === 'PRICE') return Math.abs(b.priceChangePct) - Math.abs(a.priceChangePct);
      if (metric === 'RVOL') return b.rvol - a.rvol;
      if (metric === 'VOLUME') return b.volumeSigma - a.volumeSigma;
      if (metric === 'OPEN_INTEREST') return Math.abs(b.oiChangePct) - Math.abs(a.oiChangePct);
      if (metric === 'TAKER_FLOW') return Math.abs(b.takerFlowPct) - Math.abs(a.takerFlowPct);
      if (metric === 'EAGLE_SCORE') return b.eagleScore - a.eagleScore;
      return b.anomalyScore - a.anomalyScore;
    });

    return NextResponse.json({
      success: true,
      timeframe,
      metric,
      count: anomalies.length,
      breadth,
      clusters,
      anomalies
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query heatmap anomalies' },
      { status: 500 }
    );
  }
}
