'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

const steps = [
  { 
    image: '/mock-images/how-it-works-step1.png',
    title: 'Upload Your Photo', 
    description: 'Start by uploading your favorite photos that you'd like to feature in your story.',
  },
  { 
    image: '/mock-images/how-it-works-step2.png',
    title: 'Write or Let Us Write', 
    description: 'Let your creativity flow! Write your story and our AI will help make it magical.',
  },
  { 
    image: '/mock-images/how-it-works-step3.png',
    title: 'Get Your Magical Storybook', 
    description: 'Watch as our AI transforms your story into a beautiful cartoon adventure.',
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

export function HowItWorksSection() {
  return (
    <section className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Create Your Story in 3 Easy Steps
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Turn your ideas into magical storybooks with our simple process
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {steps.map((step, index) => (
          <motion.div key={step.title} variants={itemVariants}>
            <Card className="h-full transform transition-transform hover:scale-105">
              <CardContent className="pt-6">
                <div className="aspect-square relative rounded-xl overflow-hidden mb-6">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}