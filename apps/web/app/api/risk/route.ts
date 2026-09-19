import { NextRequest, NextResponse } from 'next/server';
import { failsafeController } from '../../../../../infrastructure/failsafe';
import { riskEngineService } from '../../../../../services/risk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'ENGAGE_KILL_SWITCH') {
      const { reason } = body;
      const state = failsafeController.engageKillSwitch(reason);
      return NextResponse.json({ success: true, failsafe: state });
    }

    if (action === 'DISENGAGE_KILL_SWITCH') {
      const state = failsafeController.disengageKillSwitch();
      return NextResponse.json({ success: true, failsafe: state });
    }

    if (action === 'TRIGGER_SAFE_MODE') {
      const { reason } = body;
      const state = failsafeController.triggerSafeMode(reason || 'Manual Safe Mode triggered');
      return NextResponse.json({ success: true, failsafe: state });
    }

    if (action === 'CLEAR_SAFE_MODE') {
      const state = failsafeController.clearSafeMode();
      return NextResponse.json({ success: true, failsafe: state });
    }

    if (action === 'UPDATE_PARAMETERS') {
      const { parameters } = body;
      riskEngineService.updateParameters(parameters);
      return NextResponse.json({ success: true, risk: riskEngineService.getRiskStatus() });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Risk controller error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
