'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Upload, PencilRuler, Wand2, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-purple-50 to-blue-50 dark:from-rose-950 dark:via-purple-950 dark:to-blue-950">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div
                variants={fadeIn}
                className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Transform Photos into Stories</span>
              </motion.div>

              <motion.h1
                variants={fadeIn}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              >
                Transform Real Photos into{' '}
                <span className="text-primary">Magical Illustrated Stories</span>
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0"
              >
                Turn yourself, your child, or a loved one into the hero of a custom AI-generated storybook. 
                Upload a photo, write a story, and bring it to life with beautiful cartoon-style illustrations.
              </motion.p>

              <motion.div
                variants={fadeIn}
                className="flex flex-wrap gap-4 justify-center lg:justify-start"
              >
                <Button
                  size="lg"
                  onClick={() => router.push('/create')}
                  className="text-lg px-8"
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  Create Your Storybook
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('#how-it-works')}
                  className="text-lg px-8"
                >
                  See How It Works
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative p-4 bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-2xl shadow-xl">
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src="/mock-images/hero-storybook-mirror.png"
                    alt="Magical cartoon storybook preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="absolute -top-4 -right-4 w-24 h-24 bg-pink-200/40 dark:bg-pink-500/20 backdrop-blur-sm rounded-full animate-pulse" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-200/40 dark:bg-blue-500/20 backdrop-blur-sm rounded-full animate-pulse" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create your personalized storybook in three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload className="h-8 w-8" />,
                title: "Upload Your Photo",
                description: "Start with any photo you'd like to feature in your story"
              },
              {
                icon: <PencilRuler className="h-8 w-8" />,
                title: "Write Your Story",
                description: "Create your narrative or let our AI help you craft the perfect tale"
              },
              {
                icon: <Wand2 className="h-8 w-8" />,
                title: "Get Your Storybook",
                description: "Watch as AI transforms your story into a beautiful illustrated book"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <Card className="relative h-full bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground">Stories from our creative community</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "This brought my fantasy to life — it felt like I was in the story.",
                author: "Sarah J.",
                role: "Parent",
                rating: 5
              },
              {
                quote: "I created one for my partner's birthday — they loved it!",
                author: "Michael R.",
                role: "User",
                rating: 5
              },
              {
                quote: "Perfect for creating educational stories for my students.",
                author: "Emily T.",
                role: "Teacher",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <Card className="h-full bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-lg mb-4">{testimonial.quote}</p>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Start Your Personalized Story Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Transform your photos into magical storybook adventures
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/create')}
              className="text-lg px-8"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              Make My Storybook
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}