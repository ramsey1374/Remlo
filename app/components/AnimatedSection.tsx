/**
 * AnimatedSection - Reusable component for smooth scroll animations
 * Wraps sections with fade-in-up animation on viewport entry
 */

"use client";

import { ReactNode, CSSProperties } from "react";
import { motion } from "framer-motion";
import { fadeInUpVariant, viewportConfig } from "@/lib/animations";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  [key: string]: any; // Allow other props
}

export function AnimatedSection({ 
  children, 
  className = "", 
  id,
  style,
  ...props 
}: AnimatedSectionProps) {
  // Filter out HTML event handlers that conflict with motion.div
  const motionProps: any = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && key !== "onAnimationStart" && key !== "onAnimationEnd") {
      // Skip HTML event handlers
    } else {
      motionProps[key] = value;
    }
  }

  return (
    <motion.div
      id={id}
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={fadeInUpVariant}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
