'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scene {
  description: string;
  emotion: string;
  imagePrompt: string;
  generatedImage: string;
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

interface StoryData {
  title: string;
  story: string;
  pages: Page[];
  images: {
    original: string;
    generated: string;
  }[];
  audience: 'children' | 'young_adults' | 'adults';
}

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

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
};

export default function StoryPreviewPage() {
  const router = useRouter();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const savedData = sessionStorage.getItem('storybook-data');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setStoryData(parsedData);
    } else {
      router.push('/create');
    }
  }, [router]);

  if (!storyData) {
    return null;
  }

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < storyData.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    } else if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const currentPageData = storyData.pages[currentPage];
  const styles = audienceStyles[storyData.audience];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/create')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <div className="flex flex-col items-end">
            <h1 className="text-4xl font-bold">{storyData.title || 'Story Preview'}</h1>
            <Badge variant="secondary" className="mt-2">
              {audienceLabels[storyData.audience]}
            </Badge>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center text-xl">Main Character</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="max-w-[300px] rounded-lg overflow-hidden shadow-md">
              <img
                src={storyData.images[0]?.generated}
                alt="Main character"
                className="w-full h-auto object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="flex items-center justify-between">
              <span>Page {currentPage + 1} of {storyData.pages.length}</span>
              <span className="text-sm font-normal">
                {currentPageData.scenes.length} Scenes
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("p-0", styles.container)}>
            <div className={cn("grid", styles.grid)}>
              {currentPageData.scenes.map((scene, index) => (
                <div
                  key={index}
                  className={cn(
                    "overflow-hidden transition-transform hover:scale-[1.02]",
                    styles.card
                  )}
                >
                  <div className="aspect-video relative">
                    <img
                      src={scene.generatedImage}
                      alt={`Scene ${index + 1}`}
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover",
                        styles.image
                      )}
                    />
                  </div>
                  <div className="p-4 bg-background/95">
                    <p className={styles.text}>{scene.description}</p>
                    <p className={styles.emotion}>{scene.emotion}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-4 border-t">
              <Button
                variant="outline"
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Page
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {storyData.pages.length}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange('next')}
                disabled={currentPage === storyData.pages.length - 1}
              >
                Next Page
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}