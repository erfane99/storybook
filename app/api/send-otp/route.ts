import { NextResponse } from 'next/server';
import { getClientSupabase } from '@/lib/supabase/client';

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

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const supabase = getClientSupabase();

    // Send OTP using Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('Supabase OTP error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}