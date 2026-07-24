'use client';

import type { Variants } from 'motion/react';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface CableIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CableIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Top-left plug: settles in from the top-left (away from the cord).
const topPlugVariants: Variants = {
  normal: {
    translateX: 0,
    translateY: 0,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 12,
    },
  },
  animate: {
    translateX: [-2, 0],
    translateY: [-2, 0],
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 12,
    },
  },
};

// Bottom-right plug: settles in from the bottom-right (away from the cord).
const bottomPlugVariants: Variants = {
  normal: {
    translateX: 0,
    translateY: 0,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 12,
    },
  },
  animate: {
    translateX: [2, 0],
    translateY: [2, 0],
    transition: {
      delay: 0.05,
      type: 'spring',
      stiffness: 250,
      damping: 12,
    },
  },
};

const CableIcon = forwardRef<CableIconHandle, CableIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const reduced = useReducedMotion();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () =>
          reduced ? controls.start('normal') : controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start(reduced ? 'normal' : 'animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, reduced, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("inline-flex", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Cord (static) */}
          <path d="M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10" />

          {/* Bottom-right plug */}
          <motion.g variants={bottomPlugVariants} animate={controls}>
            <path d="M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z" />
            <path d="M17 21v-2" />
            <path d="M21 21v-2" />
          </motion.g>

          {/* Top-left plug */}
          <motion.g variants={topPlugVariants} animate={controls}>
            <path d="M3 5V3" />
            <path d="M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z" />
            <path d="M7 5V3" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

CableIcon.displayName = 'CableIcon';

export { CableIcon };
