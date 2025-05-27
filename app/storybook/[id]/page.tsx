'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
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
  audience: 'children' | 'young_adults' | 'adults';
  character_description?: string;
  is_paid: boolean;
}

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
};

const audienceStyles = {
  children: {
    container: 'gap-8 p-8',
    card: 'rounded-3xl shadow-lg border-4',
    image: 'rounded-2xl',
    text: 'text-xl font-comic leading-relaxed',
    emotion: 'text-lg font-medium text-primary',
    grid: 'grid-cols-1 md:grid-cols-2 gap-8',
  },
  young_adults: {
    container: 'gap-6 p-6',
    card: 'rounded-xl shadow-md border-2',
    image: 'rounded-lg',
    text: 'text-base font-medium leading-snug',
    emotion: 'text-sm font-semibold text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-3 gap-6',
  },
  adults: {
    container: 'gap-4 p-4',
    card: 'rounded-md shadow-sm border',
    image: 'rounded-sm',
    text: 'text-sm font-serif leading-tight',
    emotion: 'text-xs font-medium text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-4 gap-4',
  },
};

export default function StorybookPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [submittingPrint, setSubmittingPrint] = useState(false);
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

  const handlePrintRequest = async () => {
    if (!user || !storybook) return;
    
    setSubmittingPrint(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch('/api/story/request-print', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storybook_id: storybook.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit print request');
      }

      toast({
        title: 'Print Request Received',
        description: "We'll contact you shortly to complete the order.",
      });
      setPrintDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit print request',
      });
    } finally {
      setSubmittingPrint(false);
    }
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

  const isComplete = storybook?.pages?.every(page => 
    page.scenes?.every(scene => scene.generatedImage)
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/storybook/library')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h1 className="text-4xl font-bold">
              {loading ? (
                <div className="h-9 w-64 bg-muted animate-pulse rounded" />
              ) : (
                storybook?.title || 'Storybook'
              )}
            </h1>
            {storybook?.audience && (
              <Badge variant="secondary" className="mt-2">
                {audienceLabels[storybook.audience]}
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((j) => (
                      <div key={j} className="h-64 bg-muted animate-pulse rounded" />
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

            <Card>
              <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle className="flex items-center justify-between">
                  <span>Page {currentPage + 1} of {storybook.pages.length}</span>
                  <span className="text-sm font-normal">
                    {storybook.pages[currentPage]?.scenes.length} Scenes
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className={cn("p-0", audienceStyles[storybook.audience].container)}>
                <div className={cn("grid", audienceStyles[storybook.audience].grid)}>
                  {storybook.pages[currentPage]?.scenes.map((scene, index) => (
                    <div
                      key={index}
                      className={cn(
                        "overflow-hidden transition-transform hover:scale-[1.02]",
                        audienceStyles[storybook.audience].card
                      )}
                    >
                      <div className="aspect-video relative">
                        <img
                          src={scene.generatedImage}
                          alt={`Scene ${index + 1}`}
                          className={cn(
                            "absolute inset-0 w-full h-full object-cover",
                            audienceStyles[storybook.audience].image
                          )}
                        />
                      </div>
                      <div className="p-4 bg-background/95">
                        <p className={audienceStyles[storybook.audience].text}>
                          {scene.description}
                        </p>
                        <p className={audienceStyles[storybook.audience].emotion}>
                          {scene.emotion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous Page
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {storybook.pages.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage === storybook.pages.length - 1}
                  >
                    Next Page
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center space-x-4">
              {isComplete && (
                <Button
                  onClick={() => setPrintDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Professionally ($40)
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Storybook not found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Professional Print</AlertDialogTitle>
            <AlertDialogDescription>
              We'll print and ship a high-quality version of your storybook. This service costs $40. Would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePrintRequest}
              disabled={submittingPrint}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingPrint ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Print Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}