'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getClientSupabase } from '@/lib/supabase/client';
import { useStoryProgress } from '@/hooks/use-story-progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_step: 'not_started' | 'profile_completed' | 'story_created' | 'paid';
  created_at: string;
}

interface AuthContextType {
  user: any;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveAnonymousProgress: () => Promise<void>;
  updateOnboardingStep: (step: Profile['onboarding_step']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getClientSupabase();
  const { progress, clearProgress } = useStoryProgress();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to load user profile',
            });
          } else {
            setProfile(profileData);
            setUser(session.user);

            // Redirect new users to create page
            if (profileData.onboarding_step === 'not_started') {
              router.push('/create');
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, toast, router]);

  const updateOnboardingStep = async (step: Profile['onboarding_step']) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ onboarding_step: step })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, onboarding_step: step } : null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update onboarding progress',
      });
      throw error;
    }
  };

  const saveAnonymousProgress = async () => {
    if (!user || !progress) return;

    try {
      // Save story
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: user.id,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // Save scenes
      if (progress.scenes.length > 0) {
        const scenesData = progress.scenes.map((scene, index) => ({
          story_id: storyData.id,
          scene_number: index + 1,
          scene_text: scene.description,
          generated_image_url: scene.generatedImage,
        }));

        const { error: scenesError } = await supabase
          .from('story_scenes')
          .insert(scenesData);

        if (scenesError) throw scenesError;
      }

      // Update onboarding step
      await updateOnboardingStep('story_created');

      // Clear anonymous progress after successful save
      clearProgress();

      toast({
        title: 'Success',
        description: 'Your story has been saved to your account!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save story progress',
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await saveAnonymousProgress();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'Failed to sign in',
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;

      const user = data?.user;
      if (user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            email: user.email,
            onboarding_step: 'not_started'
          }]);

        if (profileError) {
          toast({
            variant: 'destructive',
            title: 'Profile Creation Failed',
            description: 'Your account was created but profile setup failed. Please contact support.',
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'Failed to create account',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: error.message || 'Failed to sign out',
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      saveAnonymousProgress,
      updateOnboardingStep,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}