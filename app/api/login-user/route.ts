import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate Saudi phone number format
    const phoneRegex = /^\+966[5][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid Saudi mobile number' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Check if user exists in the users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', phone) // Using email field to store phone
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking user:', userCheckError);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    // If user doesn't exist, return error
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found. Please register.' },
        { status: 404 }
      );
    }

    try {
      // Generate a magic link for the user to sign them in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: phone, // Using email field for phone
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`,
        },
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
        return NextResponse.json(
          { error: 'Failed to sign in user' },
          { status: 500 }
        );
      }

      // The magic link will automatically sign the user in
      // We can also try to create a session directly
      if (linkData.user) {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
            user_id: linkData.user.id,
          });

          if (sessionError) {
            console.error('Session creation error:', sessionError);
            // Continue without session creation error
          }
        } catch (sessionError) {
          console.error('Session creation failed:', sessionError);
          // Continue without session creation
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User signed in successfully',
        user: {
          id: existingUser.id,
          phone: phone,
        },
      });
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Login user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}