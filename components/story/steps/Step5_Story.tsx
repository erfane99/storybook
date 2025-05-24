'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Wand2, PencilLine, Rocket, Users, Moon, Sparkles, BookOpen } from 'lucide-react';

interface Step5_StoryProps {
  value: string;
  onChange: (value: string) => void;
  storyMode: 'manual' | 'auto';
  selectedGenre?: string;
  onModeChange: (mode: 'manual' | 'auto') => void;
  onGenreChange: (genre: string) => void;
}

const genres = [
  { 
    value: 'adventure', 
    label: 'Adventure', 
    description: 'An exciting journey filled with challenges and discoveries',
    icon: Rocket,
    audience: 'all'
  },
  { 
    value: 'siblings', 
    label: 'Playing with Siblings', 
    description: 'Fun stories about family bonding and sharing',
    icon: Users,
    audience: 'children'
  },
  { 
    value: 'bedtime', 
    label: 'Going to Sleep', 
    description: 'Calming bedtime stories for peaceful nights',
    icon: Moon,
    audience: 'children'
  },
  { 
    value: 'fantasy', 
    label: 'Fantasy/Sci-Fi', 
    description: 'Magical worlds and futuristic adventures',
    icon: Sparkles,
    audience: 'all'
  },
  { 
    value: 'history', 
    label: 'History', 
    description: 'Educational stories from the past',
    icon: BookOpen,
    audience: 'all'
  }
];

export function Step5_Story({ 
  value, 
  onChange, 
  storyMode, 
  selectedGenre, 
  onModeChange, 
  onGenreChange 
}: Step5_StoryProps) {
  const handleModeChange = (newMode: 'manual' | 'auto') => {
    onModeChange(newMode);
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
        onValueChange={handleModeChange}
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
                  <Wand2 className="h-5 w-5" />
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
        <div className="space-y-4">
          <Label>Choose a story genre</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {genres.map((genre) => {
              const Icon = genre.icon;
              return (
                <Card
                  key={genre.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedGenre === genre.value ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => onGenreChange(genre.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-1">{genre.label}</h4>
                      <p className="text-sm text-muted-foreground">{genre.description}</p>
                      {genre.audience === 'children' && (
                        <span className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          For Children
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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