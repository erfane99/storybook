'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getClientSupabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const supabase = getClientSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get access_token and refresh_token from URL hash
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1) // Remove the # character
        );
        
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (!access_token || !refresh_token) {
          throw new Error('No tokens found in URL');
        }

        // Set the user session with the tokens
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Your email has been confirmed.',
        });

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message);
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: err.message || 'Failed to complete authentication',
        });
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router, toast, supabase.auth]);

  if (error) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Completing login...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait while we confirm your account
          </p>
        </CardContent>
      </Card>
    </div>
  );
}