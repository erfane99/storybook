'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    quote: "My kids love seeing themselves in the stories! It's made bedtime reading so much more engaging.",
    name: "Sarah Johnson",
    role: "Parent",
    image: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg",
    initials: "SJ"
  },
  {
    quote: "As a teacher, this has revolutionized how I create educational content for my students.",
    name: "Michael Chen",
    role: "Teacher",
    image: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg",
    initials: "MC"
  },
  {
    quote: "The AI understands exactly what I want and creates beautiful illustrations every time.",
    name: "Emily Parker",
    role: "Author",
    image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg",
    initials: "EP"
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
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

export function TestimonialsSection() {
  return (
    <section className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          What Our Users Say
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Join thousands of happy storytellers
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {testimonials.map((testimonial) => (
          <motion.div key={testimonial.name} variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="mb-6">
                  <svg className="h-8 w-8 text-primary/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="text-lg mb-6">{testimonial.quote}</p>
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={testimonial.image} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}