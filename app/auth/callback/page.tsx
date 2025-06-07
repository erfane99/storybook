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
      try {
        const supabase = getClientSupabase();
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const next = url.searchParams.get('next') ?? '/dashboard';

        if (!code) throw new Error('No auth code found in URL');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const session = data.session;
        if (!session || !session.user) throw new Error('Session missing after exchange');

        // 🔁 Insert profile (temporarily skip auth.uid())
        const { error: insertError } = await supabase.from('profiles').upsert({
          user_id: session.user.id,
          email: session.user.email,
          user_type: 'user',
        }, {
          onConflict: 'user_id',
        });

        if (insertError) {
          console.warn('Profile insert error:', insertError);
        }

        toast({ title: 'Welcome!', description: 'You are now logged in.' });
        setTimeout(() => router.push(next), 1500);
      } catch (err: any) {
        console.error('Callback Error:', err.message || err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'There was a problem signing you in.'
        });
        setTimeout(() => router.push('/auth/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Completing login...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your account</p>
        </CardContent>
      </Card>
    </div>
  );
}
