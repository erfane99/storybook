'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useStoryProgress } from '@/hooks/use-story-progress';
import { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_step: 'not_started' | 'profile_completed' | 'story_created' | 'paid';
  user_type: 'user' | 'admin';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  saveAnonymousProgress: () => Promise<void>;
  updateOnboardingStep: (step: Profile['onboarding_step']) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_REFRESH_INTERVAL = 60000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const { progress, clearProgress } = useStoryProgress();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { getUniversalSupabase } = await import('@/lib/supabase/universal');
        const client = await getUniversalSupabase();
        setSupabase(client);

        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await refreshProfile(client, session.user.id);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        setIsLoading(false);
      }
    };

    initSupabase();
  }, []);

  const refreshProfile = async (client = supabase, userId = user?.id) => {
    if (!client || !userId) return;

    try {
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await refreshProfile(supabase, session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    const refreshInterval = setInterval(() => refreshProfile(), PROFILE_REFRESH_INTERVAL);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [supabase]);

  const updateOnboardingStep = async (step: Profile['onboarding_step']) => {
    if (!user?.id || !supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
    } catch (error: unknown) {
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update onboarding progress',
        });
      }
      throw error;
    }
  };

  const saveAnonymousProgress = async () => {
    if (!user || !progress || !supabase) return;

    try {
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

      if (progress.scenes?.length > 0) {
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

      await updateOnboardingStep('story_created');
      clearProgress();

      if (toast) {
        toast({
          title: 'Success',
          description: 'Your story has been saved to your account!',
        });
      }
    } catch (error: unknown) {
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save story progress',
        });
      }
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (router) {
        router.push('/');
      }
    } catch (error: unknown) {
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Sign Out Failed',
          description: 'Failed to sign out',
        });
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      signOut,
      saveAnonymousProgress,
      updateOnboardingStep,
      refreshProfile: () => refreshProfile(),
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