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
    const handleAuthCallback = async () => {
      const supabase = getClientSupabase();

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const redirectPath = url.searchParams.get('next') ?? '/';

        if (!code) throw new Error('No confirmation code found in URL');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw new Error(error.message);

        const session = data?.session;
        if (!session?.user) throw new Error('Failed to retrieve session');

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: session.user.id,
              email: session.user.email,
              user_type: 'user',
            },
            { onConflict: 'user_id' }
          );

        if (profileError) {
          console.warn('Profile creation error:', profileError.message);
        }

        toast({ title: 'Welcome!', description: 'You are now signed in.' });
        setTimeout(() => router.push(redirectPath), 1500);
      } catch (err: any) {
        console.error('Auth callback error:', err.message || err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'An error occurred during login.',
        });
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
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
