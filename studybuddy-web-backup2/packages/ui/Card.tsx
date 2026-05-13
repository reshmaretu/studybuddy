import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    glass?: boolean;
    border?: boolean;
}

export const Card = ({ className, glass = true, border = true, children, ...props }: CardProps) => {
    return (
        <div 
            className={cn(
                "rounded-2xl p-4 transition-all duration-300",
                glass && "bg-(--bg-card)/80 backdrop-blur-xl",
                border && "border border-(--border-color)",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
