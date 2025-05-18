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
        <h3 className="text-lg font-semibold mb-2">Step 1: Story Title</h3>
        <p className="text-muted-foreground mb-4">
          Enter the title of your story. Make it fun and memorable!
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
          autoFocus
        />
        {!value.trim() && (
          <p className="text-sm text-muted-foreground">
            Please enter a title to continue
          </p>
        )}
      </div>
    </div>
  );
}