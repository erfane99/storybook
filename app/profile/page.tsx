'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, updateOnboardingStep } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    avatar_url: profile?.avatar_url || '',
  });
  const supabase = getClientSupabase();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          avatar_url: formData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update onboarding step if profile is being completed for the first time
      if (profile?.onboarding_step === 'not_started') {
        await updateOnboardingStep('profile_completed');
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your account information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your email address cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    disabled={isLoading}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) =>
                      setFormData({ ...formData, avatar_url: e.target.value })
                    }
                    disabled={isLoading}
                    placeholder="Enter avatar URL (optional)"
                  />
                </div>

                <div>
                  <Label>Account Type</Label>
                  <div className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                    {profile?.onboarding_step === 'paid' ? 'Premium Account' : 'Free Account'}
                  </div>
                </div>

                <div>
                  <Label>Onboarding Progress</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      profile?.onboarding_step === 'not_started' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : profile?.onboarding_step === 'profile_completed'
                        ? 'bg-blue-100 text-blue-800'
                        : profile?.onboarding_step === 'story_created'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {profile?.onboarding_step === 'not_started' 
                        ? 'Getting Started'
                        : profile?.onboarding_step === 'profile_completed'
                        ? 'Profile Complete'
                        : profile?.onboarding_step === 'story_created'
                        ? 'Story Created'
                        : 'Premium Member'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}