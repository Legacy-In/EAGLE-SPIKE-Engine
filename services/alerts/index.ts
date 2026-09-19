/**
 * SIGMA — Alert Engine & Notification Service
 */

export interface SystemAlert {
  id: string;
  category:
    | 'SIGNAL_CHANGE'
    | 'REGIME_CHANGE'
    | 'FUNDING_EXTREME'
    | 'OI_SHOCK'
    | 'LIQUIDATION_SPIKE'
    | 'ORDER_FLOW_DIVERGENCE'
    | 'ETF_FLOW_SHOCK'
    | 'MACRO_SHOCK'
    | 'DATA_FAILURE'
    | 'RISK_LIMIT';
  whatHappened: string;
  whyItMatters: string;
  confidenceScore: number;
  dataQuality: number;
  actionState: string;
  timestamp: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

class AlertService {
  private alerts: SystemAlert[] = [];

  constructor() {
    this.seedDefaultAlerts();
  }

  private seedDefaultAlerts() {
    const now = Date.now();
    this.alerts = [
      {
        id: 'ALT-101',
        category: 'ORDER_FLOW_DIVERGENCE',
        whatHappened: 'Bullish Delta Divergence: Price consolidated whilst Spot CVD surged +$142M',
        whyItMatters: 'Indicates institutional spot absorption of passive sell liquidity at $78.8k support',
        confidenceScore: 82,
        dataQuality: 98,
        actionState: 'CONFIRMED TRIGGER FOR 4H LONG',
        timestamp: now - 25 * 60 * 1000,
        severity: 'INFO',
      },
      {
        id: 'ALT-102',
        category: 'REGIME_CHANGE',
        whatHappened: 'Market Regime transitioned from RANGE to RECOVERY (18h duration)',
        whyItMatters: 'Signals lower probability of choppy whipsaws; increases optimal holding period',
        confidenceScore: 78,
        dataQuality: 96,
        actionState: 'EXPAND TARGET TO TP2 ($81,750)',
        timestamp: now - 3 * 3600 * 1000,
        severity: 'INFO',
      },
      {
        id: 'ALT-103',
        category: 'ETF_FLOW_SHOCK',
        whatHappened: 'Verified ETF Net Inflows exceeded +$180M (Farside / Bitbo Verified)',
        whyItMatters: 'Spot structural bid counterbalances perpetual futures volatility',
        confidenceScore: 91,
        dataQuality: 91,
        actionState: 'MACRO FLOW ALIGNED',
        timestamp: now - 8 * 3600 * 1000,
        severity: 'INFO',
      },
    ];
  }

  public getAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  public triggerAlert(alert: Omit<SystemAlert, 'id' | 'timestamp'>) {
    const newAlert: SystemAlert = {
      ...alert,
      id: `ALT-${Date.now()}`,
      timestamp: Date.now(),
    };
    this.alerts.unshift(newAlert);
    if (this.alerts.length > 50) this.alerts.pop();
    return newAlert;
  }
}

export const alertService = new AlertService();
