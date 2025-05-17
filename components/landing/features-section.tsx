'use client';

import { motion } from 'framer-motion';
import { Sparkles, Image, Book, Palette, Share2, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: <Image className="h-6 w-6" />,
    title: "Personal Photos",
    description: "Include your own photos in the story",
    color: "bg-pink-100 dark:bg-pink-900",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI Magic",
    description: "Transform photos into cartoon art",
    color: "bg-blue-100 dark:bg-blue-900",
  },
  {
    icon: <Book className="h-6 w-6" />,
    title: "Easy Creation",
    description: "Write stories with AI assistance",
    color: "bg-green-100 dark:bg-green-900",
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Art Styles",
    description: "Choose from multiple cartoon styles",
    color: "bg-purple-100 dark:bg-purple-900",
  },
  {
    icon: <Share2 className="h-6 w-6" />,
    title: "Share Stories",
    description: "Share with family and friends",
    color: "bg-orange-100 dark:bg-orange-900",
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "Save Forever",
    description: "Download and keep your stories",
    color: "bg-yellow-100 dark:bg-yellow-900",
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4
    }
  }
};

export function FeaturesSection() {
  return (
    <section className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Magical Features
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Everything you need to create enchanting stories
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={itemVariants}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-start space-x-4">
                <div className={`rounded-full p-3 ${feature.color}`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}