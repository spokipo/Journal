import React from 'react';
import { motion } from 'framer-motion';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.24, 
        delay, 
        ease: [0.16, 1, 0.3, 1] // Токен кривой из design.md
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}