import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function loadSignalById(id: string) {
  const root = process.cwd();
  const candidates = [
    path.resolve(root, 'data'),
    path.resolve(root, '..', '..', 'data'),
  ];
  let dataDir = candidates[0];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      dataDir = c;
      break;
    }
  }

  const signalsFile = path.join(dataDir, 'confluence_signals.json');
  if (!fs.existsSync(signalsFile)) return null;

  try {
    const signals = JSON.parse(fs.readFileSync(signalsFile, 'utf-8'));
    return signals.find((s: any) => s.id === id || s.signal_key === id) || null;
  } catch (e) {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing signal id' }, { status: 400 });
    }

    const signal = loadSignalById(id);
    if (!signal) {
      return NextResponse.json(
        { error: 'Not Found', message: `Signal with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: signal,
      meta: {
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}
