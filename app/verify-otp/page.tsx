'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';

interface VerifyFormData {
  otp_code: string;
}

function VerifyOTPContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const phone = searchParams.get('phone');
  const supabase = getClientSupabase();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<VerifyFormData>();

  const otpCode = watch('otp_code');

  useEffect(() => {
    if (!phone) {
      router.push('/auth');
    } else {
      // Start countdown on initial load (OTP was sent when user arrived)
      setResendCountdown(30);
    }
  }, [phone, router]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpCode && otpCode.length === 6 && !isLoading) {
      // Small delay to ensure the user sees the complete input
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [otpCode, isLoading, handleSubmit]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const onSubmit = async (data: VerifyFormData) => {
    if (!phone) return;

    setIsLoading(true);

    try {
      // First, verify the OTP
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          otp_code: data.otp_code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      // OTP verification successful, now handle user profile creation
      try {
        // Get the current session/user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to get user session');
        }

        if (session?.user) {
          // Check if profile exists in profiles table
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .single();

          // If profile doesn't exist, create it
          if (profileCheckError && profileCheckError.code === 'PGRST116') {
            // PGRST116 means no rows returned, so profile doesn't exist
            const currentTime = new Date().toISOString();
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                user_id: session.user.id,
                email: phone, // Using phone as email since we're using phone auth
                user_type: 'user',
                full_name: '',
                avatar_url: '',
                created_at: currentTime,
                updated_at: currentTime,
              })
              .single();

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Don't throw here - user is authenticated, profile creation is secondary
              toast({
                variant: 'destructive',
                title: 'Profile Creation Warning',
                description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
              });
            } else {
              console.log('✅ User profile created successfully');
            }
          } else if (profileCheckError) {
            // Some other error occurred
            console.error('Error checking user profile:', profileCheckError);
            toast({
              variant: 'destructive',
              title: 'Profile Check Warning',
              description: 'Account verified but profile check failed. Please contact support if issues persist.',
            });
          } else {
            // Profile already exists
            console.log('✅ User profile already exists');
          }
        } else {
          console.warn('No user session found after OTP verification');
        }
      } catch (profileError: any) {
        console.error('Profile handling error:', profileError);
        // Don't prevent login for profile errors
        toast({
          variant: 'destructive',
          title: 'Profile Setup Warning',
          description: 'Account verified but profile setup incomplete. You can continue using the app.',
        });
      }

      toast({
        title: 'Success',
        description: 'Phone number verified successfully!',
      });

      // Redirect to home page
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phone || resendCountdown > 0) return;

    setIsResending(true);

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      toast({
        title: 'OTP Resent',
        description: 'A new verification code has been sent to your phone.',
      });

      // Start countdown again
      setResendCountdown(30);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to resend OTP',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!phone) {
    return null;
  }

  const canResend = resendCountdown === 0 && !isResending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Phone</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to{' '}
            <span className="font-medium">{phone}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp_code">Verification Code</Label>
              <Input
                id="otp_code"
                type="text"
                placeholder="123456"
                maxLength={6}
                {...register('otp_code', {
                  required: 'Verification code is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Please enter a valid 6-digit code',
                  },
                })}
                disabled={isLoading}
                className="text-center text-2xl tracking-widest font-mono"
                autoComplete="one-time-code"
                autoFocus
              />
              {errors.otp_code && (
                <p className="text-sm text-destructive">{errors.otp_code.message}</p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {otpCode && otpCode.length === 6 && !isLoading 
                  ? 'Auto-submitting...' 
                  : 'Code will auto-submit when complete'
                }
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !otpCode || otpCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="outline"
                onClick={handleResendOTP}
                disabled={!canResend}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>
              {resendCountdown > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  You can resend the code in {resendCountdown}s
                </p>
              )}
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/auth')}
                className="text-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}