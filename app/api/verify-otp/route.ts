import { NextResponse } from 'next/server';
import { getClientSupabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phone, otp_code } = await request.json();

    if (!phone || !otp_code) {
      return NextResponse.json(
        { error: 'Phone number and OTP code are required' },
        { status: 400 }
      );
    }

    // Validate OTP code format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp_code)) {
      return NextResponse.json(
        { error: 'Invalid OTP code format' },
        { status: 400 }
      );
    }

    const supabase = getClientSupabase();

    // Verify OTP using Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp_code,
      type: 'sms',
    });

    if (error) {
      console.error('Supabase OTP verification error:', error);
      return NextResponse.json(
        { error: error.message || 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      );
    }

    // Create or update user profile
    try {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email || '',
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the request if profile creation fails
      }
    } catch (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue with successful authentication even if profile creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      user: {
        id: data.user.id,
        phone: data.user.phone,
      },
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}