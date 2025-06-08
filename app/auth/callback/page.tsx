'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getClientSupabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          throw new Error(error.message);
        }

        if (session?.user) {
          // Successfully authenticated, redirect to home
          router.push('/');
        } else {
          // No session found, redirect back to auth with error
          throw new Error('Authentication failed - no session found');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: error.message || 'Failed to complete sign-in process',
        });

        // Redirect back to auth page
        router.push('/auth');
      }
    };

    handleAuthCallback();
  }, [router, toast, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}