import { scannerAggregator } from '../../../../../../backend/aggregator';
import { EagleSignalRecord, ScannerSnapshotPayload } from '../../../../../../backend/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot immediately upon connection
      scannerAggregator
        .getSnapshot()
        .then((snapshot) => {
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
          );
        })
        .catch((err) => {
          console.warn('Initial snapshot error:', err.message);
        });

      // Handler for periodic snapshots
      const handleSnapshot = (snapshot: ScannerSnapshotPayload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      // Handler for immediate signal alerts
      const handleSignal = (signal: EagleSignalRecord) => {
        try {
          controller.enqueue(
            encoder.encode(`event: signal\ndata: ${JSON.stringify(signal)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      // Heartbeat ping every 10s to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {"time":${Date.now()}}\n\n`));
        } catch {
          cleanup();
        }
      }, 10000);

      const cleanup = () => {
        clearInterval(heartbeatInterval);
        scannerAggregator.removeListener('snapshot', handleSnapshot);
        scannerAggregator.removeListener('signal', handleSignal);
      };

      scannerAggregator.on('snapshot', handleSnapshot);
      scannerAggregator.on('signal', handleSignal);

      // Start background aggregator if not running
      scannerAggregator.start();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
