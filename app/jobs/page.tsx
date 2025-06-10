'use client';

import { JobDashboard } from '@/components/jobs/job-dashboard';

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-6xl">
        <JobDashboard />
      </div>
    </div>
  );
}