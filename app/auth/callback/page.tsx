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
        console.log('[🔁 code]', code);

        if (!code) throw new Error('Missing auth code');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[🔁 exchangeCodeForSession]', data, error);
        if (error) throw error;

        const session = data.session;
        console.log('[👤 session]', session);
        if (!session?.user) throw new Error('Session creation failed');

        const { error: insertError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: session.user.id,
              email: session.user.email,
              user_type: 'user'
            },
            { onConflict: 'user_id' }
          );

        console.log('[📦 profile insert]', insertError);
        if (insertError) throw insertError;

        toast({ title: 'Welcome!', description: 'You’re now signed in.' });
        setTimeout(() => router.push(next), 1500);
      } catch (err: any) {
        console.error('[❌ Callback error]', err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'Something went wrong'
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
