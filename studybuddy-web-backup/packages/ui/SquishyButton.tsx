'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { playTick } from '@studybuddy/api';

interface SquishyButtonProps extends HTMLMotionProps<'button'> {
  className?: string;
}

export const SquishyButton = React.forwardRef<HTMLButtonElement, SquishyButtonProps>(
  ({ children, className = '', onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playTick();
      if (onClick) onClick(e);
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9, rotate: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={handleClick}
        className={className}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

SquishyButton.displayName = 'SquishyButton';
