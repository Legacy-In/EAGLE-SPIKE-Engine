import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainProofDiagnostics } from '@sigma/backend/services/blockchain-proof.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const diagnostics = getBlockchainProofDiagnostics();

  return NextResponse.json({
    success: true,
    service: 'EAGLE_FLASH_BLOCKCHAIN_PROOF_ENGINE',
    timestamp: new Date().toISOString(),
    ...diagnostics,
  });
}
