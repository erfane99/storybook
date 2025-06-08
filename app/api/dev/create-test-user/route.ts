import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    // Validate phone number exists
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
        { error: 'Please enter a valid Saudi mobile number (+966 5XXXXXXXX)' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already exists in auth.users
    const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.listUsers();
    
    if (authCheckError) {
      console.error('Error checking existing auth users:', authCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing users', details: authCheckError },
        { status: 500 }
      );
    }

    // Check if phone number already exists (using phone field or email field)
    const existingUser = existingAuthUser.users.find(user => 
      user.phone === phone || user.email === phone
    );

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists',
        user_id: existingUser.id
      });
    }

    // Create new user using Supabase Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      phone: phone,
      phone_confirm: true, // Auto-confirm phone for test users
      user_metadata: {
        phone: phone,
        created_via: 'dev-api',
        created_at: new Date().toISOString()
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user', details: createError },
        { status: 500 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      );
    }

    // Insert user into the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: newUser.user.id,
        email: phone, // Using email field to store phone for consistency
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't fail the request if profile creation fails, but log it
      console.warn('User created in auth but profile creation failed');
    }

    return NextResponse.json({
      success: true,
      user_id: newUser.user.id,
      phone: phone,
      message: 'Test user created successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in create-test-user:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || error.toString() 
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

// 🛑 NOTE: Remove this endpoint after testing is complete to avoid leaving admin logic publicly exposed