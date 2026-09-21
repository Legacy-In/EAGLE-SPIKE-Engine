import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

/**
 * Returns the Supabase Admin client with service_role privileges
 * Used strictly by the backend daemon for writing signals, extremes, and checkpoints.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    if (!serviceRoleKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Database persistence will be disabled.');
    }
    adminClient = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}

/**
 * Returns the read-only Supabase client using the public anon key.
 */
export function getSupabaseAnon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return anonClient;
}
