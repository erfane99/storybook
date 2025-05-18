'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Step1_TitleProps {
  value: string;
  onChange: (value: string) => void;
}

export function Step1_Title({ value, onChange }: Step1_TitleProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Give your story a title</h3>
        <p className="text-muted-foreground mb-4">
          Choose a memorable title that captures the essence of your story.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Story Title</Label>
        <Input
          id="title"
          placeholder="Enter your story title"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-xl"
        />
      </div>
    </div>
  );
}