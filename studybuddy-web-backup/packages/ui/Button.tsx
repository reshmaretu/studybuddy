import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';
import { playTick } from '@studybuddy/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button = ({ className, variant = 'primary', onClick, ...props }: ButtonProps) => {
    const variants = {
        primary: 'bg-(--text-main) text-(--bg-dark) hover:brightness-110',
        secondary: 'bg-(--bg-dark)/50 text-(--text-muted) hover:text-(--text-main)',
        outline: 'border border-(--border-color) hover:bg-(--bg-card)',
        ghost: 'hover:bg-(--bg-card)'
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        playTick();
        if (onClick) (onClick as any)(e);
    };

    return (
        <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className={cn(
                "px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-30",
                variants[variant],
                className
            )}
            {...props}
        />
    );
};
