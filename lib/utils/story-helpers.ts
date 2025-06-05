import { createClient } from '@supabase/supabase-js';

interface StoryScene {
  description: string;
  emotion: string;
  imagePrompt: string;
  generatedImage?: string;
}

interface StoryPage {
  pageNumber: number;
  scenes: StoryScene[];
}

export const audienceConfig = {
  children: {
    scenes: 10,
    pages: 4,
    notes: 'Simple, playful structure. 2–3 scenes per page.',
    container: 'gap-8 p-8',
    card: 'rounded-3xl shadow-lg border-4',
    image: 'rounded-2xl',
    text: 'text-xl font-comic leading-relaxed',
    emotion: 'text-lg font-medium text-primary',
    grid: 'grid-cols-1 md:grid-cols-2 gap-8',
  },
  young_adults: {
    scenes: 14,
    pages: 6,
    notes: '2–3 scenes per page with meaningful plot turns.',
    container: 'gap-6 p-6',
    card: 'rounded-xl shadow-md border-2',
    image: 'rounded-lg',
    text: 'text-base font-medium leading-snug',
    emotion: 'text-sm font-semibold text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-3 gap-6',
  },
  adults: {
    scenes: 18,
    pages: 8,
    notes: '3–5 scenes per page, allow complexity and layered meaning.',
    container: 'gap-4 p-4',
    card: 'rounded-md shadow-sm border',
    image: 'rounded-sm',
    text: 'text-sm font-serif leading-tight',
    emotion: 'text-xs font-medium text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-4 gap-4',
  }
};

export const storyGenres = [
  { 
    value: 'adventure', 
    label: 'Adventure', 
    description: 'An exciting journey filled with challenges and discoveries',
    audience: 'all'
  },
  { 
    value: 'siblings', 
    label: 'Playing with Siblings', 
    description: 'Fun stories about family bonding and sharing',
    audience: 'children'
  },
  { 
    value: 'bedtime', 
    label: 'Going to Sleep', 
    description: 'Calming bedtime stories for peaceful nights',
    audience: 'children'
  },
  { 
    value: 'fantasy', 
    label: 'Fantasy/Sci-Fi', 
    description: 'Magical worlds and futuristic adventures',
    audience: 'all'
  },
  { 
    value: 'history', 
    label: 'History', 
    description: 'Educational stories from the past',
    audience: 'all'
  }
];

export const saveStoryToSupabase = async (
  supabase: ReturnType<typeof createClient>,
  data: {
    title: string;
    story: string;
    pages: StoryPage[];
    userId?: string;
    audience: keyof typeof audienceConfig;
    characterDescription?: string;
  }
) => {
  const { data: storybook, error } = await supabase
    .from('storybook_entries')
    .insert({
      title: data.title,
      story: data.story,
      pages: data.pages,
      user_id: data.userId,
      audience: data.audience,
      character_description: data.characterDescription,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return storybook;
};

export const getGridCols = (sceneCount: number): string => {
  switch (sceneCount) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-1 sm:grid-cols-2';
    case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    default: return 'grid-cols-1';
  }
};