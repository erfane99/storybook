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
        if (!code) throw new Error('Missing confirmation code');

        // 1. Exchange code for session (login user)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session?.user) throw error || new Error('No session returned');

        const user = data.session.user;

        // 2. Insert profile if it doesn't exist (safe upsert)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            email: user.email,
            user_type: 'user',
          }, { onConflict: 'user_id' });

        if (profileError) console.warn('Profile insert warning:', profileError.message);

        toast({
          title: 'Welcome!',
          description: 'Your email has been verified and you are now logged in.',
        });

        // 3. Redirect to homepage
        setTimeout(() => router.push('/'), 1500);
      } catch (err: any) {
        console.error('Auth callback error:', err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'Something went wrong.',
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
          <p className="text-lg font-medium">Logging you in...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait while we confirm your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
