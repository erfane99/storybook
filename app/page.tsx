import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const HomeClient = dynamic(() => import('@/app/_components/home-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-purple-50 to-blue-50 dark:from-rose-950 dark:via-purple-950 dark:to-blue-950">
      <div className="container mx-auto px-4 pt-32">
        <div className="animate-pulse space-y-8">
          <div className="h-12 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
});

export default function Page() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}