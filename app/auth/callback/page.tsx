'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getClientSupabase, handleDeepLink } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

// More reliable browser detection
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export default function CallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        let session;

        if (isWeb) {
          const { data, error } = await supabase.auth.getSessionFromUrl();
          if (error) throw error;
          session = data.session;
        } else {
          const url = window.location.href;
          const { data, error } = await handleDeepLink(url);
          if (error) throw error;
          session = data?.session;
        }

        if (!session) throw new Error('No session returned');

        // Optional profile creation
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            onboarding_step: 'not_started',
            user_type: 'user'
          }, {
            onConflict: 'id'
          });

        if (profileError) console.error('Profile creation error:', profileError);

        toast({
          title: 'Welcome back!',
          description: 'You\'re now logged in.',
        });

        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);

      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: error.message || 'Failed to complete authentication',
        });
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router, supabase, toast]);

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
