/**
 * Smooth scroll animation variants for premium fintech aesthetic
 * Inspired by Stripe, Linear, and Apple motion design
 * - Minimal, elegant motion
 * - GPU-friendly transforms
 * - Smooth easing functions
 */

export const fadeInUpVariant = {
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
    },
  },
};

export const fadeInVariant = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.34, 1.56, 0.64, 1] as any, // easeOut cubic
    },
  },
};

export const staggerContainerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerVariantFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const scaleInVariant = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1] as any, // easeOut cubic
    },
  },
};

// Viewport configuration for triggering animations
export const viewportConfig = {
  once: true, // animate only once when entering viewport
  amount: 0.2, // trigger when 20% of element is visible
  margin: "0px 0px -100px 0px", // trigger 100px before reaching viewport
};

// Stagger animation delays for cards
export const cardDelays = [0.1, 0.2, 0.3, 0.4, 0.5];
