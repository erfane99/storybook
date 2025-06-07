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

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Generate a random 6-digit OTP
    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time to 5 minutes from now
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Insert or update the phone_otp table
    const { error } = await supabase
      .from('phone_otp')
      .upsert({
        phone,
        otp_code,
        expires_at,
        verified: false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'phone'
      });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Mock mode: Log OTP to console instead of sending SMS
    console.log(`🔐 OTP for ${phone}: ${otp_code} (expires in 5 minutes)`);

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