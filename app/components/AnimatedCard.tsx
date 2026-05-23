/**
 * AnimatedCard - Individual card with smooth fade-in-up animation
 * Used in staggered card groups
 */

"use client";

import { ReactNode, CSSProperties } from "react";
import { motion } from "framer-motion";
import { viewportConfig } from "@/lib/animations";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
  style?: CSSProperties;
  [key: string]: any; // Allow other props
}

export function AnimatedCard({ 
  children, 
  className = "", 
  index = 0, 
  style,
  ...props 
}: AnimatedCardProps) {
  // Additional stagger delay based on card index
  const customVariant = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1] as any, // easeOut cubic
        delay: index * 0.1,
      },
    },
  };

  // Filter out HTML event handlers that conflict with motion.div
  const motionProps: any = {};
  const htmlProps: any = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && key !== "onAnimationStart" && key !== "onAnimationEnd") {
      htmlProps[key] = value;
    } else {
      motionProps[key] = value;
    }
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={customVariant}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
