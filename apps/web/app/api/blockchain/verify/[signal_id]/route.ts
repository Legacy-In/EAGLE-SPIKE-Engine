import { NextRequest, NextResponse } from 'next/server';
import { verifySignal } from '@sigma/backend/services/blockchain-proof.mjs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signal_id: string }> }
) {
  try {
    const { signal_id } = await params;
    if (!signal_id) {
      return NextResponse.json({
        success: false,
        status: 'UNAVAILABLE',
        error: 'Missing required signal_id parameter',
      }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('event_type') || 'SIGNAL_CREATED';

    const verificationResult = await verifySignal(signal_id, eventType);

    const isVerified = verificationResult.status === 'VERIFIED';
    const statusCode = isVerified ? 200 : verificationResult.status === 'MISMATCH' ? 409 : 200;

    return NextResponse.json({
      success: isVerified,
      ...verificationResult,
      verified_at: new Date().toISOString(),
    }, { status: statusCode });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: 'UNAVAILABLE',
      error: err.message || 'Cryptographic verification service error',
    }, { status: 500 });
  }
}
