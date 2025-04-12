
import { createClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk/v3";
export const createSupabaseClient = () => {
  logger.log('Creating Supabase client', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  return createClient(
    // These details can be found in your Supabase project settings under `API`
    process.env.NEXT_PUBLIC_SUPABASE_URL as string, // e.g. https://abc123.supabase.co - replace 'abc123' with your project ID
    process.env.SUPABASE_SERVICE_ROLE_KEY as string // Your service role secret key
  );
};