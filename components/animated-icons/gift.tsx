'use client';

import type { Variants } from 'motion/react';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface GiftIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GiftIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const boxVariants: Variants = {
  normal: {
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  animate: {
    rotate: [0, -8, 8, -4, 4, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

const lidVariants: Variants = {
  normal: {
    translateY: 0,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  animate: {
    translateY: [0, -1.5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

const GiftIcon = forwardRef<GiftIconHandle, GiftIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const shouldReduceMotion = useReducedMotion();

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () =>
          controls.start(shouldReduceMotion ? 'normal' : 'animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start(shouldReduceMotion ? 'normal' : 'animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter, shouldReduceMotion]
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
          <motion.g
            variants={boxVariants}
            initial="normal"
            animate={controls}
            style={{ transformOrigin: '12px 22px', transformBox: 'view-box' }}
          >
            <path d="M12 8v13" />
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <motion.g variants={lidVariants} initial="normal" animate={controls}>
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
            </motion.g>
          </motion.g>
        </svg>
      </div>
    );
  }
);

GiftIcon.displayName = 'GiftIcon';

export { GiftIcon };
