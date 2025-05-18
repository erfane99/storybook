'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';

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
}

export default function StorybookPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getClientSupabase();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
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
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/storybook/library')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <h1 className="text-4xl font-bold">
            {loading ? (
              <Skeleton className="h-9 w-64" />
            ) : (
              storybook?.title || 'Storybook'
            )}
          </h1>
        </div>

        {loading ? (
          <div className="space-y-12">
            <Skeleton className="h-24 w-full" />
            {[1, 2].map((pageIndex) => (
              <div key={pageIndex} className="mb-12">
                <Skeleton className="h-8 w-32 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((sceneIndex) => (
                    <Skeleton key={sceneIndex} className="h-96" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : storybook ? (
          <div className="space-y-12 storybook-content">
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">{storybook.story}</p>
              </CardContent>
            </Card>

            {storybook.pages.map((page) => (
              <div key={page.pageNumber} className="mb-12">
                <h2 className="text-2xl font-bold mb-6">
                  Page {page.pageNumber}
                </h2>
                <div className={`grid ${getGridCols(page.scenes.length)} gap-6`}>
                  {page.scenes.map((scene, sceneIndex) => (
                    <Card key={sceneIndex} className="h-full flex flex-col overflow-hidden">
                      <div className="aspect-[4/3] relative">
                        <img
                          src={scene.generatedImage}
                          alt={`Scene ${sceneIndex + 1}`}
                          className="absolute inset-0 w-full h-full object-cover rounded-t"
                        />
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <p className="bg-yellow-100 border border-yellow-300 p-2 rounded font-medium text-sm md:text-base shadow-sm">
                          {scene.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
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
