'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from '@/components/ui/motion';
import Image from 'next/image';
import { Sparkles, Wand2 } from 'lucide-react';

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950">
      <div className="container flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Transform Photos into Stories</span>
            </div>
            <motion.h1 
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Create Your Own
              <motion.span 
                className="block text-primary dark:text-primary mt-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Magical Storybook
              </motion.span>
            </motion.h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Turn cherished photos into enchanting cartoon adventures. Our AI brings your stories 
              to life with beautiful illustrations that capture the magic of every moment.
            </p>
          </motion.div>
          
          <motion.div 
            className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={() => router.push('/create')}
              className="text-base px-8 bg-primary hover:bg-primary/90"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              Start Your Story
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push('/examples')}
              className="text-base px-8"
            >
              View Examples
            </Button>
          </motion.div>
        </div>
        
        <motion.div 
          className="flex-1 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.pexels.com/photos/4143791/pexels-photo-4143791.jpeg"
                alt="Magical cartoon-style illustration of a child reading a glowing storybook"
                width={800}
                height={600}
                className="w-full h-auto"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent mix-blend-overlay rounded-2xl" />
            </div>
            
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-pink-200/40 dark:bg-pink-500/20 backdrop-blur-sm rounded-full animate-pulse" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-200/40 dark:bg-indigo-500/20 backdrop-blur-sm rounded-full animate-pulse" />
            <div className="absolute top-1/2 -right-8 w-16 h-16 bg-purple-200/40 dark:bg-purple-500/20 backdrop-blur-sm rounded-lg transform rotate-12 animate-pulse" />
          </div>
        </motion.div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 dark:bg-purple-500/10 rounded-full filter blur-3xl animate-pulse" />
      </div>
    </section>
  );
}