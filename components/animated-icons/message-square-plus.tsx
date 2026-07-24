'use client';

import type { Variants } from 'motion/react';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MessageSquarePlusIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageSquarePlusIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const bubbleVariants: Variants = {
  normal: {
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 14,
    },
  },
  animate: {
    rotate: [-6, 0],
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 14,
    },
  },
};

const plusVariants: Variants = {
  normal: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 14,
    },
  },
  animate: {
    scale: [0.4, 1],
    opacity: [0, 1],
    transition: {
      delay: 0.1,
      scale: {
        type: 'spring',
        stiffness: 300,
        damping: 14,
      },
      opacity: {
        duration: 0.15,
        ease: 'easeOut',
      },
    },
  },
};

const MessageSquarePlusIcon = forwardRef<
  MessageSquarePlusIconHandle,
  MessageSquarePlusIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const controls = useAnimation();
  const reducedMotion = useReducedMotion();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () =>
        reducedMotion ? controls.start('normal') : controls.start('animate'),
      stopAnimation: () => controls.start('normal'),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) {
        controls.start(reducedMotion ? 'normal' : 'animate');
      } else {
        onMouseEnter?.(e);
      }
    },
    [controls, reducedMotion, onMouseEnter]
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
      className={cn('inline-flex', className)}
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
        <motion.path
          d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
          variants={bubbleVariants}
          initial="normal"
          animate={controls}
          style={{ transformBox: 'view-box', transformOrigin: '3px 21px' }}
        />
        <motion.g
          variants={plusVariants}
          initial="normal"
          animate={controls}
          style={{ transformBox: 'view-box', transformOrigin: '12px 11px' }}
        >
          <path d="M12 8v6" />
          <path d="M9 11h6" />
        </motion.g>
      </svg>
    </div>
  );
});

MessageSquarePlusIcon.displayName = 'MessageSquarePlusIcon';

export { MessageSquarePlusIcon };
