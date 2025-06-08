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

        if (process.env.NODE_ENV !== 'production') {
          console.log('🔐 Loaded session:', session);
        }
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        setIsLoading(false);
      }
    };

    initSupabase();
  }, []);

  const refreshProfile = async (client = supabase, userId = user?.id): Promise<void> => {
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
        setProfile(profileData as Profile);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('👤 Profile:', profileData);
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const createProfileIfNotExists = async (client: SupabaseClient<Database>, user: User): Promise<void> => {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await client
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist (PGRST116 = no rows returned), create it
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        const currentTime = new Date().toISOString();
        
        const { error: insertError } = await client
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            user_type: 'user',
            onboarding_step: 'not_started',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            created_at: currentTime,
          })
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          if (toast) {
            toast({
              variant: 'destructive',
              title: 'Profile Creation Warning',
              description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
            });
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ User profile created successfully for Google sign-in');
          }
        }
      } else if (profileCheckError) {
        // Some other error occurred
        console.error('Error checking user profile:', profileCheckError);
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Check Warning',
            description: 'Account verified but profile check failed. Please contact support if issues persist.',
          });
        }
      } else {
        // Profile already exists
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ User profile already exists');
        }
      }
    } catch (error) {
      console.error('Error in createProfileIfNotExists:', error);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Create profile if it doesn't exist (for Google sign-in)
        await createProfileIfNotExists(supabase, session.user);
        
        // Then refresh the profile data
        await refreshProfile(supabase, session.user.id);
      } else if (event === 'SIGNED_OUT') {
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

  const updateOnboardingStep = async (step: Profile['onboarding_step']): Promise<void> => {
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

  const saveAnonymousProgress = async (): Promise<void> => {
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

  const signOut = async (): Promise<void> => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (router) {
        router.replace('/');
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