'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function CallbackPage() {
  const router = useRouter();
  const supabase = getClientSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const next = url.searchParams.get('next') ?? '/';

        if (!code) {
          throw new Error('No code provided');
        }

        const { error } = await supabase.auth.exchangeCodeForSession({
          code,
          options: {
            redirectTo: next
          }
        });

        if (error) {
          throw error;
        }

        toast({
          title: 'Welcome back!',
          description: 'You\'re now logged in.',
        });

        // Delay for toast to be visible before redirect
        setTimeout(() => {
          router.push(next);
        }, 1500); // 1.5 second delay
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: error.message
        });
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router, supabase]);

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