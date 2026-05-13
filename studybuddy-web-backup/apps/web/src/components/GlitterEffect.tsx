'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlitterEffectProps {
  x?: number;
  y?: number;
  count?: number;
  color?: string;
  duration?: number;
}

export const GlitterEffect: React.FC<GlitterEffectProps> = ({
  x = 50,
  y = 50,
  count = 8,
  color = 'var(--accent-teal)',
  duration = 0.8,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;
        const size = 2 + Math.random() * 3;

        return (
          <motion.div
            key={i}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: targetX,
              y: targetY,
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration,
              ease: 'easeOut',
            }}
            className="absolute pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};
