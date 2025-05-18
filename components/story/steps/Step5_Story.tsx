'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Step5_StoryProps {
  value: string;
  onChange: (value: string) => void;
}

export function Step5_Story({ value, onChange }: Step5_StoryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Write Your Story</h3>
        <p className="text-muted-foreground mb-4">
          Tell your story! Be creative and descriptive. Your story will be transformed into illustrated scenes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="story">Story Text</Label>
        <Textarea
          id="story"
          placeholder="Once upon a time..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[300px]"
        />
        <p className="text-sm text-muted-foreground">
          Word count: {value.trim().split(/\s+/).length}
        </p>
      </div>
    </div>
  );
}