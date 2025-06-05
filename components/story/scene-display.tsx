'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { audienceConfig } from '@/lib/utils/story-helpers';
import Image from 'next/image';

interface Scene {
  description: string;
  emotion: string;
  generatedImage: string;
}

interface SceneDisplayProps {
  scene: Scene;
  audience: keyof typeof audienceConfig;
}

export function SceneDisplay({ scene, audience }: SceneDisplayProps) {
  const styles = audienceConfig[audience];

  return (
    <div className={cn(
      "overflow-hidden transition-transform hover:scale-[1.02]",
      styles.card
    )}>
      <div className="aspect-video relative">
        <Image
          src={scene.generatedImage}
          alt={scene.description}
          fill
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
  );
}