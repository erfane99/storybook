import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Exchange code for session
      await supabase.auth.exchangeCodeForSession(code);

      // Get the session again to ensure we have the latest data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error after code exchange:', sessionError);
        throw sessionError;
      }

      if (session?.user) {
        try {
          // Check if user profile exists in the users table
          const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          // If no profile exists (PGRST116 = no rows returned), create one
          if (userCheckError && userCheckError.code === 'PGRST116') {
            const currentTime = new Date().toISOString();
            
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email || session.user.phone || '',
                user_type: 'user',
                onboarding_step: 'not_started',
                created_at: currentTime,
              });

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Log error but don't prevent redirect - user is authenticated
            } else {
              console.log('✅ User profile created successfully for Google sign-in');
            }
          } else if (userCheckError) {
            // Some other error occurred during profile check
            console.error('Error checking user profile:', userCheckError);
          } else {
            // Profile already exists
            console.log('✅ User profile already exists');
          }
        } catch (profileError) {
          console.error('Profile handling error:', profileError);
          // Don't prevent redirect for profile errors
        }
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      // Continue with redirect even if there are errors
    }
  }

  return NextResponse.redirect(new URL('/', request.url));
}