import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// Real Alumni Data - 74 Cards
const ALUMNI_FILES = Array.from({ length: 74 }).map((_, i) => `card_${i + 1}.png`);

// Configuration
const CYCLE_DURATION = 5000; // 5 seconds per shift
// Aspect Ratio: 2135 x 850 (~2.51)
// Scaled down by 2 for display: 1068 x 425
const CARD_WIDTH = 1068; 
const CARD_HEIGHT = 425;

export default function LivingWall() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Infinite Cycle Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => prev + 1);
    }, CYCLE_DURATION);

    return () => clearInterval(interval);
  }, []);

  // Calculate visible range: [active-2, active-1, active, active+1, active+2]
  const visibleIndices = Array.from({ length: 5 }, (_, i) => activeIndex - 2 + i);

  return (
    <div className="relative w-full h-screen bg-[#F1F0EC] overflow-hidden flex items-center justify-center">
      {/* Central Axis Container - Height increased to accommodate vertical spread */}
      <div 
        className="relative w-full max-w-4xl h-[800px] flex items-center justify-center"
        style={{ 
          perspective: '600px', // Stronger perspective for clearer 3D effect
          transformStyle: 'preserve-3d' 
        }} 
      >
        <AnimatePresence mode='popLayout'>
          {visibleIndices.map((index) => {
            const wrappedIndex = ((index % ALUMNI_FILES.length) + ALUMNI_FILES.length) % ALUMNI_FILES.length;
            const image = ALUMNI_FILES[wrappedIndex];
            
            const offset = index - activeIndex;
            let slot: 'exit' | 'top' | 'middle' | 'bottom' | 'enter' = 'enter';
            
            if (offset === 0) slot = 'middle';
            else if (offset === -1) slot = 'top';
            else if (offset === 1) slot = 'bottom';
            else if (offset < -1) slot = 'exit';
            else if (offset > 1) slot = 'enter';

            return (
              <DeckCard 
                key={`card-${index}`} 
                image={image}
                slot={slot}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DeckCard({ image, slot }: { image: string, slot: 'exit' | 'top' | 'middle' | 'bottom' | 'enter' }) {
  
  // Strict User Requirements for Geometry & Motion
  // NOTE: We must account for the -50% centering offset in these values
  // Middle = -50% (Centered)
  // Top = -50% - 125% = -175%
  // Bottom = -50% + 125% = 75%
  const variants: Variants = {
    exit: {
      y: '-250%', // Way off screen
      x: 'calc(-50% + 400px)', // Further right for trajectory
      scale: 0.6,
      opacity: 0,
      zIndex: 0,
      rotateZ: 10, // Continue rotation
      rotateX: 20, // Continue 3D tilt
      filter: 'blur(10px)',
    },
    top: {
      y: '-175%', // Peeking from top (only bottom visible)
      x: 'calc(-50% + 220px)', // Shifted right to align right edges (Calculated: ~0.2W)
      scale: 0.8, 
      opacity: 0.6,
      zIndex: 1,
      rotateZ: 5, // 5 degree Z-rotation (Gentle Wheel)
      rotateX: 10, // 10 degree X-rotation (3D Depth)
      filter: 'blur(2px)',
    },
    middle: {
      y: '-50%', // Centered
      x: '-50%', // Centered
      scale: 1.2, // Larger
      opacity: 1,
      zIndex: 10,
      rotateZ: 0, // Flat
      rotateX: 0, // Flat
      filter: 'blur(0px)',
    },
    bottom: {
      y: '75%', // Peeking from bottom (only top visible)
      x: 'calc(-50% + 220px)', // Shifted right to align right edges (Calculated: ~0.2W)
      scale: 0.8, 
      opacity: 0.6,
      zIndex: 1,
      rotateZ: -5, // -5 degree Z-rotation
      rotateX: -10, // -10 degree X-rotation
      filter: 'blur(2px)',
    },
    enter: {
      y: '250%', // Way off screen
      x: 'calc(-50% + 400px)', // Further right for trajectory
      scale: 0.6,
      opacity: 0,
      zIndex: 0,
      rotateZ: -10, // Start rotation
      rotateX: -20, // Start 3D tilt
      filter: 'blur(10px)',
    }
  };

  // Snappy Spring Transition
  const springTransition = {
    type: "spring" as const,
    stiffness: 120,
    damping: 20,
    mass: 1
  };

  // Dynamic Idle Animations
  // Continuous Upward Motion: All cards drift up slowly during the 5s idle
  const idleVariants: Variants = {
    middle: {
      scale: [1.0, 1.02], // Subtle breathing relative to parent scale
      y: ['0%', '-8%'],   // Continuous slow upward drift
      transition: {
        scale: {
          duration: 5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror"
        },
        y: {
          duration: 5, // Matches cycle duration
          ease: "linear", // Constant speed
          repeat: Infinity,
          // No repeatType mirror, we want it to reset or flow? 
          // Actually, for continuous flow, it should just move up. 
          // But since the slot changes, we just need it to move up *during* the slot time.
        }
      }
    },
    floating: {
      y: ['0%', '-8%'], // Continuous slow upward drift for others too
      transition: {
        duration: 5,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 origin-center will-change-transform"
      style={{ 
        width: CARD_WIDTH, 
        height: CARD_HEIGHT,
        // Removed x/y from here to allow variants to control positioning
      }}
      initial={false}
      animate={slot}
      variants={variants}
      transition={springTransition}
    >
      {/* Inner Wrapper for Dynamic Idle */}
      <motion.div
        className="w-full h-full relative"
        animate={slot === 'middle' ? 'middle' : 'floating'}
        variants={idleVariants}
      >
        <div 
          className="w-full h-full overflow-hidden bg-transparent transition-all duration-500"
          style={{
            // Enhanced Drop Shadow for Premium Texture
            filter: slot === 'middle' 
              ? 'drop-shadow(0 20px 30px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(0,0,0,0.1))' 
              : 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
          }}
        >
          {/* Image - Full Size, No Crop */}
          <img 
            src={`/alumni-cards/${image}`} 
            alt="Alumni" 
            className="w-full h-full object-contain"
          />
          
          {/* Shine Effect */}
          {slot === 'middle' && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-30 pointer-events-none" />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
