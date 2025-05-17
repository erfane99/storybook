import { useState, useEffect } from 'react';

interface StoryProgress {
  title: string;
  story: string;
  images: string[];
  scenes: {
    description: string;
    imagePrompt: string;
    generatedImage?: string;
  }[];
}

export function useStoryProgress() {
  const [progress, setProgress] = useState<StoryProgress | null>(null);

  useEffect(() => {
    // Load progress from sessionStorage on mount
    const savedProgress = sessionStorage.getItem('storyProgress');
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  const saveProgress = (data: StoryProgress) => {
    sessionStorage.setItem('storyProgress', JSON.stringify(data));
    setProgress(data);
  };

  const clearProgress = () => {
    sessionStorage.removeItem('storyProgress');
    setProgress(null);
  };

  return {
    progress,
    saveProgress,
    clearProgress,
  };
}