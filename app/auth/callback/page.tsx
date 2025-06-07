'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getClientSupabase();

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (!code) throw new Error('Missing authorization code');

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session?.user) {
          throw new Error(error?.message || 'Failed to create session');
        }

        const user = data.session.user;

        // Insert profile if not exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              user_type: 'free', // default type
            },
            { onConflict: 'user_id' }
          );

        if (profileError) {
          console.warn('Failed to insert profile:', profileError.message);
        }

        toast({ title: 'Welcome!', description: 'You’re now signed in.' });

        router.replace('/'); // ✅ redirect to home page
      } catch (err: any) {
        console.error('Auth callback error:', err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: err.message || 'Something went wrong',
        });
        router.replace('/auth/login'); // fallback
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
