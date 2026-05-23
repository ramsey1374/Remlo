/**
 * AnimatedStaggerContainer - Container for staggered child animations
 * All children animate with a smooth stagger effect
 */

"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { staggerContainerVariant, viewportConfig } from "@/lib/animations";

interface AnimatedStaggerContainerProps {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export function AnimatedStaggerContainer({ 
  children, 
  className = "",
  fast = false 
}: AnimatedStaggerContainerProps) {
  const variant = fast ? staggerContainerVariant : staggerContainerVariant;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={variant}
    >
      {children}
    </motion.div>
  );
}
