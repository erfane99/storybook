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
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        phone: phone
      });

      if (error) {
        console.error('Error generating login link:', error);
        return NextResponse.json(
          { error: 'Failed to generate login link', details: error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        login_url: data.action_link,
        message: 'Login link generated'
      });

    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to generate login link', details: authError },
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