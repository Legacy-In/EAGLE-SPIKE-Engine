import { NextRequest, NextResponse } from 'next/server';
import { mobileSupervisor } from '../../../../../../backend/mobile/mobile_worker_supervisor.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const fleet = mobileSupervisor.getFleetStatus();
    const metrics = mobileSupervisor.getSystemMetrics();
    const logs = mobileSupervisor.logBuffer.slice(-80);

    return NextResponse.json({
      success: true,
      fleet,
      metrics,
      logs,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch mobile engine telemetry' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || '';
    const workerId = body.workerId || '';

    if (action === 'start_all') {
      await mobileSupervisor.startAll();
      return NextResponse.json({
        success: true,
        message: 'All 11 workers started',
        fleet: mobileSupervisor.getFleetStatus(),
      });
    }

    if (action === 'stop_all') {
      await mobileSupervisor.stopAll();
      return NextResponse.json({
        success: true,
        message: 'All workers stopped',
        fleet: mobileSupervisor.getFleetStatus(),
      });
    }

    if (action === 'toggle_worker' && workerId) {
      const worker = mobileSupervisor.workers.get(workerId);
      if (!worker) {
        return NextResponse.json({ success: false, error: `Worker ${workerId} not found` }, { status: 404 });
      }

      if (worker.status === 'RUNNING') {
        await mobileSupervisor.stopWorker(workerId);
      } else {
        await mobileSupervisor.startWorker(workerId);
      }

      return NextResponse.json({
        success: true,
        worker: {
          id: worker.id,
          name: worker.name,
          status: worker.status,
          ticksCount: worker.ticksCount,
        },
        fleet: mobileSupervisor.getFleetStatus(),
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to execute engine command' },
      { status: 500 }
    );
  }
}
