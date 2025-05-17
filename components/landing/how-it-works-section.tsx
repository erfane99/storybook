'use client';

import { motion } from 'framer-motion';
import { Upload, PencilRuler, Wand2, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    icon: <Upload className="h-8 w-8" />,
    title: "Upload Your Photos",
    description: "Start by uploading your favorite photos that you'd like to feature in your story.",
    color: "bg-blue-100 dark:bg-blue-900",
  },
  {
    icon: <PencilRuler className="h-8 w-8" />,
    title: "Write Your Story",
    description: "Let your creativity flow! Write your story and our AI will help make it magical.",
    color: "bg-green-100 dark:bg-green-900",
  },
  {
    icon: <Wand2 className="h-8 w-8" />,
    title: "AI Magic",
    description: "Watch as our AI transforms your story into a beautiful cartoon adventure.",
    color: "bg-purple-100 dark:bg-purple-900",
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "Share & Enjoy",
    description: "Your storybook is ready! Share it with friends and family or keep it as a special memory.",
    color: "bg-orange-100 dark:bg-orange-900",
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
          Create Your Story in 4 Easy Steps
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
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {steps.map((step, index) => (
          <motion.div key={step.title} variants={itemVariants}>
            <Card className="h-full transform transition-transform hover:scale-105">
              <CardContent className="pt-6">
                <div className={`rounded-full p-3 w-16 h-16 mb-4 ${step.color} flex items-center justify-center`}>
                  {step.icon}
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