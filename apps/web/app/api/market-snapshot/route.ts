import { NextResponse } from 'next/server';
import { marketDataService } from '../../../../../services/market-data';
import { derivativesService } from '../../../../../services/derivatives';
import { onChainService } from '../../../../../services/onchain';
import { macroService } from '../../../../../services/macro';
import { sentimentService } from '../../../../../services/sentiment';
import { signalEngineService } from '../../../../../services/signals';
import { forecastService } from '../../../../../services/forecast';
import { riskEngineService } from '../../../../../services/risk';
import { portfolioService } from '../../../../../services/portfolio';
import { executionEngineService } from '../../../../../services/execution';
import { alertService } from '../../../../../services/alerts';
import { aiIntelligenceService } from '../../../../../services/ai';
import { monitoringService } from '../../../../../infrastructure/monitoring';
import { failsafeController } from '../../../../../infrastructure/failsafe';

export async function GET() {
  try {
    const market = marketDataService.getSnapshot();
    const derivatives = derivativesService.getMetrics();
    const onchain = onChainService.getOnChainMetrics();
    const etf = onChainService.getEtfFlowMetrics();
    const macro = macroService.getMacroMetrics();
    const sentiment = sentimentService.getSentiment();
    const signal = signalEngineService.getPrimarySignal();
    const regime = signalEngineService.evaluateRegime();
    const mtf = signalEngineService.getMultiTimeframeAnalysis();
    const forecast = forecastService.getForecast('4H');
    const positions = portfolioService.getPositions();
    const currentExposureUsd = positions.reduce((acc, p) => acc + p.notionalUsd, 0);
    const risk = riskEngineService.getRiskStatus(currentExposureUsd);
    const orders = executionEngineService.getOrders();
    const journal = portfolioService.getTradeJournal();
    const alerts = alertService.getAlerts();
    const aiBrief = aiIntelligenceService.generateMarketBrief();
    const health = monitoringService.getHealthSummary();
    const failsafe = failsafeController.getState();
    const tradingMode = executionEngineService.getTradingMode();

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      market,
      derivatives: derivatives.metrics,
      positioning: derivatives.metrics.positioning,
      onchain: onchain.metrics,
      etf: etf.metrics,
      macro: macro.metrics,
      sentiment,
      signal,
      regime,
      mtf,
      forecast,
      positions,
      orders,
      journal,
      risk,
      alerts,
      aiBrief,
      health,
      failsafe,
      tradingMode,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
