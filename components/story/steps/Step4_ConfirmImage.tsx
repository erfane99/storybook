'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface Step4_ConfirmImageProps {
  imageUrl: string;
  cartoonizedUrl: string;
  onRetry: () => void;
  onNext: () => void;
  retryCount: number;
}

export function Step4_ConfirmImage({
  imageUrl,
  cartoonizedUrl,
  onRetry,
  onNext,
  retryCount
}: Step4_ConfirmImageProps) {
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
              <img
                src={cartoonizedUrl}
                alt="Cartoon"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-sm mt-2 text-muted-foreground">Cartoon</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={retryCount >= 3}
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

        <Button
          onClick={onNext}
          disabled={!cartoonizedUrl}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}