'use client';

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
} from 'framer-motion';

export const FadeIn = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}) => {
  const directionConfig = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        ...directionConfig[direction],
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
};

export { motion, animate, useMotionValue, useTransform, useSpring, useScroll, useInView };