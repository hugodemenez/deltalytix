'use client';

import { motion, useAnimation } from 'motion/react';
import type { Variants } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ClipboardCheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ClipboardCheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const checkVariants: Variants = {
  normal: {
    pathLength: 1,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: 'easeInOut' },
      opacity: { duration: 0.4, ease: 'easeInOut' },
    },
  },
};

const ClipboardCheckIcon = forwardRef<
  ClipboardCheckIconHandle,
  ClipboardCheckIconProps
>(({ onClick, className, size = 28, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => controls.start('animate'),
      stopAnimation: () => controls.start('normal'),
    };
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) {
        controls.start('animate');
        // Auto-reset after animation completes
        setTimeout(() => {
          controls.start('normal');
        }, 800); // Duration of animation + buffer
      }
      onClick?.(e);
    },
    [controls, onClick]
  );

  return (
    <div
      className={cn(className, "cursor-pointer")}
      onClick={handleClick}
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
        className="text-primary"
      >
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <motion.path
          animate={controls}
          initial="normal"
          variants={checkVariants}
          d="m9 14 2 2 4-4"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
});

ClipboardCheckIcon.displayName = 'ClipboardCheckIcon';

export { ClipboardCheckIcon };
