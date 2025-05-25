'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Download, Lock, Share2 } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface Scene {
  description: string;
  emotion: string;
  generatedImage: string;
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

interface Storybook {
  id: string;
  title: string;
  story: string;
  pages: Page[];
  audience: 'children' | 'young_adults' | 'adults';
  character_description?: string;
  is_paid: boolean;
}

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
};

export default function StorybookViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getClientSupabase();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    async function fetchStorybook() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No access token available');
        }

        const response = await fetch(`/api/story/get-user-storybook-by-id?id=${params.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch storybook');
        }

        const { storybook: data } = await response.json();
        setStorybook(data);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to load storybook',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStorybook();
  }, [user, params.id, router, supabase, toast]);

  const handleShare = async () => {
    if (!user?.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    if (profile?.onboarding_step !== 'paid') {
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/storybook/${storybook?.id}/view`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy share link',
      });
    }
  };

  const handleDownload = () => {
    if (!user?.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    if (profile?.onboarding_step !== 'paid') {
      return;
    }

    toast({
      title: 'Download started',
      description: 'Your storybook will be downloaded shortly',
    });
    // Implement download logic here
  };

  if (!user) {
    return null;
  }

  const getGridCols = (sceneCount: number) => {
    switch (sceneCount) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/storybook/library')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            {loading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <div>
                <h1 className="text-4xl font-bold">{storybook?.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>{audienceLabels[storybook?.audience || 'children']}</span>
                </div>
              </div>
            )}
          </div>
          
          {!loading && storybook && (
            <div className="flex items-center gap-2">
              {profile?.onboarding_step === 'paid' ? (
                <>
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : (
                <Card className="p-4 bg-muted">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">Unlock sharing and downloading</p>
                      <p className="text-xs text-muted-foreground">Purchase this storybook to access all features</p>
                    </div>
                    <Button variant="default" className="ml-4">
                      Unlock Now
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-64" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : storybook ? (
          <div className="space-y-12">
            {storybook.character_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Main Character</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{storybook.character_description}</p>
                </CardContent>
              </Card>
            )}

            {storybook.pages.map((page, pageIndex) => (
              <Card key={pageIndex}>
                <CardHeader>
                  <CardTitle>Page {pageIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${getGridCols(page.scenes.length)} gap-6`}>
                    {page.scenes.map((scene, sceneIndex) => (
                      <div key={sceneIndex} className="space-y-4">
                        <div className="aspect-video relative rounded-lg overflow-hidden">
                          <img
                            src={scene.generatedImage}
                            alt={`Scene ${sceneIndex + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg">{scene.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Emotion: {scene.emotion}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Storybook not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}