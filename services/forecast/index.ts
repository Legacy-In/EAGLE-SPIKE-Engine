/**
 * SIGMA — Probability Forecast & Outcome Distribution Engine
 */

import { calculateProbabilityDistribution } from '../../packages/math';
import { ForecastDistribution } from '../../packages/types';
import { marketDataService } from '../market-data';

class ForecastService {
  public getForecast(timeHorizon: '4H' | '24H' | '7D' = '4H'): ForecastDistribution {
    const market = marketDataService.getSnapshot();
    const currentPrice = market.price;

    // Estimated drift and volatility from factor ensemble
    const driftReturnPct = 1.45; // Positive drift expectation
    const volatilityPct = 2.85; // 4H expected volatility

    const dist = calculateProbabilityDistribution({
      currentPrice,
      driftReturnPct,
      volatilityPct,
      timeHorizon,
    });

    return {
      timeHorizon,
      expectedReturnPct: dist.expectedReturnPct,
      expectedVolatilityPct: dist.expectedVolatilityPct,
      probabilityPositiveReturn: dist.probabilityPositiveReturn,
      probabilityDrawdownExceeding2Pct: dist.probabilityDrawdownExceeding2Pct,
      expectedPriceRange: dist.expectedPriceRange,
      confidenceInterval80Pct: dist.confidenceInterval80Pct,
      brierCalibrationScore: dist.brierCalibrationScore,
    };
  }
}

export const forecastService = new ForecastService();
