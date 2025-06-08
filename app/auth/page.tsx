'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getClientSupabase } from '@/lib/supabase/client';

interface PhoneFormData {
  phone: string;
}

export default function AuthPage() {
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('phone');
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const supabase = getClientSupabase();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PhoneFormData>();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Auto-focus phone input when switching to phone tab
  useEffect(() => {
    if (activeTab === 'phone') {
      const phoneInput = document.getElementById('phone');
      if (phoneInput) {
        setTimeout(() => phoneInput.focus(), 100);
      }
    }
  }, [activeTab]);

  const onPhoneSubmit = async (data: PhoneFormData) => {
    setIsPhoneLoading(true);

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: data.phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      toast({
        title: 'OTP Sent',
        description: 'Please check your phone for the verification code.',
      });

      // Redirect to verify page with phone number
      router.push(`/verify-otp?phone=${encodeURIComponent(data.phone)}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send OTP',
      });
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message || 'Failed to sign in with Google',
      });
      setIsGoogleLoading(false);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <p className="text-muted-foreground">
            Sign in or create an account to continue
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="google" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit(onPhoneSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+966 5XXXXXXXX"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\+966[5][0-9]{8}$/,
                        message: 'Please enter a valid Saudi mobile number',
                      },
                    })}
                    disabled={isPhoneLoading}
                    className="text-base"
                    autoFocus
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use your Saudi mobile number (e.g., +966 5XXXXXXX)
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPhoneLoading}
                >
                  {isPhoneLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Continue with Phone
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="google" className="space-y-4 mt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in quickly with your Google account
                </p>
                
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}