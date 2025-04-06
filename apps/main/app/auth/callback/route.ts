import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data,error } = await supabase.auth.exchangeCodeForSession(code)

    const { user, session } = data;
    const providerRefreshToken = session?.provider_refresh_token;
    const providerToken = session?.provider_token;

    if (user && providerRefreshToken) {
      // Store tokens in the user_google_tokens table
      const { error: dbError } = await supabase.from("user_google_tokens").upsert({
        user_id: user.id,
        provider_refresh_token: providerRefreshToken,
        provider_token: providerToken,
        token_expires_at: session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Failed to store Google tokens:", dbError);
      }
    }
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}