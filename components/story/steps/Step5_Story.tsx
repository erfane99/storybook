'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Magic, PencilLine } from 'lucide-react';

interface Step5_StoryProps {
  value: string;
  onChange: (value: string) => void;
}

type StoryMode = 'manual' | 'auto';

const genres = [
  { value: 'adventure', label: 'Adventure', description: 'An exciting journey filled with challenges and discoveries' },
  { value: 'siblings', label: 'Playing with Siblings', description: 'Fun stories about family bonding and sharing', audience: 'children' },
  { value: 'bedtime', label: 'Going to Sleep', description: 'Calming bedtime stories for peaceful nights', audience: 'children' },
  { value: 'fantasy', label: 'Fantasy/Sci-Fi', description: 'Magical worlds and futuristic adventures' },
  { value: 'history', label: 'History', description: 'Educational stories from the past' },
];

export function Step5_Story({ value, onChange }: Step5_StoryProps) {
  const [storyMode, setStoryMode] = useState<StoryMode>('manual');
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  const handleModeChange = (newMode: StoryMode) => {
    setStoryMode(newMode);
    if (newMode === 'auto') {
      // Clear the story text when switching to auto mode
      onChange('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Write Your Story</h3>
        <p className="text-muted-foreground mb-4">
          Choose how you'd like to create your story - write it yourself or let our AI help you!
        </p>
      </div>

      <RadioGroup
        value={storyMode}
        onValueChange={(value: StoryMode) => handleModeChange(value)}
        className="grid gap-4"
      >
        <Card className={`cursor-pointer transition-all ${storyMode === 'manual' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="manual" className="flex items-center gap-2 font-medium text-lg cursor-pointer">
                  <PencilLine className="h-5 w-5" />
                  I'll write my own story
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Express your creativity by writing the story yourself
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${storyMode === 'auto' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="auto" id="auto" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto" className="flex items-center gap-2 font-medium text-lg cursor-pointer">
                  <Magic className="h-5 w-5" />
                  Help me write it!
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Let our AI create a unique story based on your chosen genre
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>

      {storyMode === 'auto' && (
        <div className="space-y-2">
          <Label htmlFor="genre">Choose a story genre</Label>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger>
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              {genres.map((genre) => (
                <SelectItem key={genre.value} value={genre.value}>
                  <div>
                    <div className="font-medium">{genre.label}</div>
                    <div className="text-xs text-muted-foreground">{genre.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {storyMode === 'manual' && (
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
      )}
    </div>
  );
}