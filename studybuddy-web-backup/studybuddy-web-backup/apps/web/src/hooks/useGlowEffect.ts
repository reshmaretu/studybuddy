import { useEffect, useState } from 'react';

export const useGlowEffect = (value: number, duration: number = 500) => {
  const [isGlowing, setIsGlowing] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);

  useEffect(() => {
    if (value !== previousValue) {
      setIsGlowing(true);
      const timer = setTimeout(() => {
        setIsGlowing(false);
      }, duration);
      setPreviousValue(value);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue, duration]);

  return isGlowing;
};

export const useGlitterEffect = (value: number, duration: number = 500) => {
  const [showGlitter, setShowGlitter] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);

  useEffect(() => {
    if (value !== previousValue) {
      // Wait for glow to complete before showing glitter
      const glowDelay = setTimeout(() => {
        setShowGlitter(true);
        const glitterTimer = setTimeout(() => {
          setShowGlitter(false);
        }, 800);
        return () => clearTimeout(glitterTimer);
      }, duration);

      setPreviousValue(value);
      return () => clearTimeout(glowDelay);
    }
  }, [value, previousValue, duration]);

  return showGlitter;
};
