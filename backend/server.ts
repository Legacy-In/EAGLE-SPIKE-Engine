import http from 'http';
import { scannerAggregator } from './aggregator';
import { statefulSignalEngine } from './engine/signals';

const PORT = parseInt(process.env.SCANNER_PORT || '3001', 10);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Health Endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'HEALTHY', uptime: process.uptime(), timestamp: Date.now() }));
    return;
  }

  // 2. Snapshot Endpoint
  if (url.pathname === '/snapshot') {
    try {
      const snapshot = await scannerAggregator.getSnapshot();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: snapshot }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err?.message }));
    }
    return;
  }

  // 3. SSE Stream Endpoint
  if (url.pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Send immediate snapshot
    scannerAggregator.getSnapshot().then((snap) => sendEvent('snapshot', snap)).catch(() => {});

    const onSnapshot = (snap: any) => sendEvent('snapshot', snap);
    const onSignal = (sig: any) => sendEvent('signal', sig);

    scannerAggregator.on('snapshot', onSnapshot);
    scannerAggregator.on('signal', onSignal);

    req.on('close', () => {
      scannerAggregator.removeListener('snapshot', onSnapshot);
      scannerAggregator.removeListener('signal', onSignal);
    });
    return;
  }

  // 4. Signals Endpoint
  if (url.pathname === '/signals') {
    const signals = statefulSignalEngine.getSignals(100);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: signals.length, signals }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`🦅 Eagle Flash Aggregation Server running on http://localhost:${PORT}`);
  scannerAggregator.start();
});
