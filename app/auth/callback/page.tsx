'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function CallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const next = url.searchParams.get('next') ?? '/dashboard';

        if (!code) throw new Error('No confirmation code provided');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const session = data?.session;
        const user = session?.user;

        if (!user) throw new Error('No session returned from Supabase');

        console.log('🔐 User session:', user);

        // Attempt to upsert profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id, // Must match the column name
            email: user.email,
            onboarding_step: 'not_started',
            user_type: 'user'
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.error('⚠️ Profile creation error:', profileError);
          // Don't block login if profile insert fails
        }

        toast({
          title: 'Welcome back!',
          description: 'You are now logged in.',
        });

        // Redirect to next page
        setTimeout(() => router.push(next), 1200);
      } catch (err: any) {
        console.error('❌ Auth callback error:', err);
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: err.message || 'An unknown error occurred',
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
