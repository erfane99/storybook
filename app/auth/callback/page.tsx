'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function CallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getClientSupabase();

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const next = url.searchParams.get('next') ?? '/dashboard';
        if (!code) throw new Error('Missing auth code');

        // Step 1: Exchange the code
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (!data.session?.user) throw new Error('Session not returned');

        const { user } = data.session;

        // Step 2: Wait 1-2s to ensure Supabase reflects session state
        await new Promise((res) => setTimeout(res, 1000));

        // Step 3: Try inserting profile
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              user_type: 'user',
            },
            { onConflict: 'user_id' }
          );

        if (insertError) {
          console.warn('Profile insert failed:', insertError.message);
          // Don’t throw — allow navigation to continue
        }

        toast({ title: 'Welcome!', description: 'You’re now signed in.' });
        router.push(next);
      } catch (err: any) {
        console.error('Callback error:', err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'Something went wrong',
        });
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, toast]);

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
