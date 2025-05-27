'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const supabase = getClientSupabase();

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup'
      });

      if (error) throw error;

      toast({
        title: 'Email sent',
        description: 'Check your inbox for the verification link',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to resend verification email',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              We've sent you a verification link to your email address.
              Please click the link to verify your account.
            </p>

            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend verification email'
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Make sure to check your spam folder if you don't see the email.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-sm">
            Changed your mind?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Return to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}