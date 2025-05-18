'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Step4_ConfirmImageProps {
  imageUrl: string;
  cartoonStyle: string;
  cartoonizedUrl?: string;
  updateFormData: (data: any) => void;
}

export function Step4_ConfirmImage({
  imageUrl,
  cartoonStyle,
  cartoonizedUrl,
  updateFormData,
}: Step4_ConfirmImageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!cartoonizedUrl && imageUrl && cartoonStyle) {
      generateCartoonImage();
    }
  }, []);

  const generateCartoonImage = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let finalPrompt = prompt;

      // Get image description if not already available
      if (!finalPrompt) {
        const describeRes = await fetch('/api/image/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        if (!describeRes.ok) {
          throw new Error('Failed to describe image');
        }

        const { characterDescription } = await describeRes.json();
        finalPrompt = characterDescription;
        setPrompt(characterDescription);
      }

      // Generate cartoon image
      const cartoonizeRes = await fetch('/api/image/cartoonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          style: cartoonStyle,
          imageUrl,
        }),
      });

      if (!cartoonizeRes.ok) {
        throw new Error('Failed to generate cartoon image');
      }

      const { url } = await cartoonizeRes.json();
      updateFormData({ cartoonizedUrl: url });
    } catch (error: any) {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate cartoon image',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    if (retryCount >= 3) return;
    setRetryCount(prev => prev + 1);
    generateCartoonImage();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Cartoon Image</h3>
        <p className="text-muted-foreground mb-4">
          Make sure you're happy with your cartoon image before continuing. You can retry up to 3 times.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square relative rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-sm mt-2 text-muted-foreground">Original</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="aspect-square relative rounded-lg overflow-hidden">
              {isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : cartoonizedUrl ? (
                <img
                  src={cartoonizedUrl}
                  alt="Cartoon"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <p className="text-muted-foreground">Generating cartoon image...</p>
                </div>
              )}
            </div>
            <p className="text-center text-sm mt-2 text-muted-foreground">Cartoon</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={retryCount >= 3 || isGenerating}
          className="flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate Image
          {retryCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({3 - retryCount} tries left)
            </span>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </div>
  );
}
