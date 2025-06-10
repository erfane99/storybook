'use client';

import { MultiStepStoryFormWithJobs } from '@/components/story/MultiStepStoryFormWithJobs';

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <MultiStepStoryFormWithJobs />
      </div>
    </div>
  );
}