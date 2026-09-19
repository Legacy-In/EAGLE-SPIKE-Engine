/**
 * SIGMA — Failsafe, Kill-Switch & Safe-Mode Controller
 */

export interface FailsafeState {
  safeMode: boolean;
  safeModeReason?: string;
  safeModeTriggeredAt?: number;
  killSwitchEngaged: boolean;
  killSwitchEngagedAt?: number;
  tradingAllowed: boolean;
  systemStatus: 'SYSTEM_ONLINE' | 'SAFE_MODE' | 'DATA_DEGRADED' | 'KILL_SWITCH_ACTIVE';
}

class FailsafeController {
  private state: FailsafeState = {
    safeMode: false,
    killSwitchEngaged: false,
    tradingAllowed: true,
    systemStatus: 'SYSTEM_ONLINE',
  };

  private listeners: ((state: FailsafeState) => void)[] = [];

  public getState(): FailsafeState {
    return { ...this.state };
  }

  public engageKillSwitch(reason = 'Manual Emergency Kill Switch Triggered'): FailsafeState {
    this.state.killSwitchEngaged = true;
    this.state.killSwitchEngagedAt = Date.now();
    this.state.safeMode = true;
    this.state.safeModeReason = reason;
    this.state.tradingAllowed = false;
    this.state.systemStatus = 'KILL_SWITCH_ACTIVE';
    this.notify();
    return this.getState();
  }

  public disengageKillSwitch(): FailsafeState {
    this.state.killSwitchEngaged = false;
    this.state.killSwitchEngagedAt = undefined;
    if (!this.state.safeModeReason || this.state.safeModeReason.includes('Kill Switch')) {
      this.state.safeMode = false;
      this.state.safeModeReason = undefined;
      this.state.tradingAllowed = true;
      this.state.systemStatus = 'SYSTEM_ONLINE';
    }
    this.notify();
    return this.getState();
  }

  public triggerSafeMode(reason: string): FailsafeState {
    this.state.safeMode = true;
    this.state.safeModeReason = reason;
    this.state.safeModeTriggeredAt = Date.now();
    this.state.tradingAllowed = false;
    if (!this.state.killSwitchEngaged) {
      this.state.systemStatus = 'SAFE_MODE';
    }
    this.notify();
    return this.getState();
  }

  public clearSafeMode(): FailsafeState {
    if (this.state.killSwitchEngaged) {
      // Cannot clear safe mode while kill switch is active
      return this.getState();
    }
    this.state.safeMode = false;
    this.state.safeModeReason = undefined;
    this.state.safeModeTriggeredAt = undefined;
    this.state.tradingAllowed = true;
    this.state.systemStatus = 'SYSTEM_ONLINE';
    this.notify();
    return this.getState();
  }

  public subscribe(listener: (state: FailsafeState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const s = this.getState();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error('Failsafe listener error:', err);
      }
    }
  }
}

export const failsafeController = new FailsafeController();
