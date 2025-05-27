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
      const { error } = await supabase.auth.exchangeCodeForSession();

      if (error) {
        router.push('/auth/login');
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You're now logged in.',
      });

      // Delay for toast to be visible before redirect
      setTimeout(() => {
        router.push('/');
      }, 1500); // 1.5 second delay
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