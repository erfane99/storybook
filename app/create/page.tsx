'use client';

import { MultiStepStoryForm } from '@/components/story/MultiStepStoryForm';

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <MultiStepStoryForm />
      </div>
    </div>
  );
}