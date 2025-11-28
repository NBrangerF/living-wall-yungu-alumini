import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// Real Alumni Data - 74 Cards
const ALUMNI_FILES = Array.from({ length: 74 }).map((_, i) => `card_${i + 1}.png`);

interface CardState {
  id: string;
  image: string;
  status: 'floating' | 'spotlight' | 'exiting';
  // Physics parameters
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  durationX: number;
  durationY: number;
  delayX: number;
  delayY: number;
}

const MAX_CARDS = 5;
const CARD_WIDTH = 300;
const HIGH_RES_WIDTH = 900; // 3x Resolution for sharpness
const EST_CARD_HEIGHT = 420;

// Tuned Safety Buffers
const BUFFER_X = 400;      // Increased to prevent side clipping
const BUFFER_TOP = 450;    // Increased to prevent top clipping
const BUFFER_BOTTOM = 100; // Decreased to allow cards to go lower

export default function LivingWall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<CardState[]>([]);
  
  // Initialize cards
  useEffect(() => {
    if (!containerRef.current) return;
    if (cards.length > 0) return;

    const { clientWidth, clientHeight } = containerRef.current;
    const initialCards: CardState[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < MAX_CARDS; i++) {
      let index = Math.floor(Math.random() * ALUMNI_FILES.length);
      while (usedIndices.has(index)) {
        index = Math.floor(Math.random() * ALUMNI_FILES.length);
      }
      usedIndices.add(index);
      initialCards.push(createCard(ALUMNI_FILES[index], clientWidth, clientHeight));
    }

    setCards(initialCards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spotlight Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        // Find a floating card to spotlight
        const floating = prev.filter(c => c.status === 'floating');
        if (floating.length === 0) return prev;
        
        // Don't spotlight if someone is already spotlighted
        if (prev.some(c => c.status === 'spotlight')) return prev;

        const target = floating[Math.floor(Math.random() * floating.length)];
        
        return prev.map(c => c.id === target.id ? { ...c, status: 'spotlight' } : c);
      });

      // Schedule Exit
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          c.status === 'spotlight' ? { ...c, status: 'exiting' } : c
        ));
      }, 12000); // 12s Spotlight duration (5s enter + 7s hold)

    }, 18000); // Check every 18s

    return () => clearInterval(interval);
  }, []);

  const handleRecycle = useCallback((id: string) => {
    setCards(prev => {
      const remaining = prev.filter(c => c.id !== id);
      
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const nextImage = ALUMNI_FILES[Math.floor(Math.random() * ALUMNI_FILES.length)];
        const newCard = createCard(nextImage, clientWidth, clientHeight);
        return [...remaining, newCard];
      }
      return remaining;
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#F1F0EC] overflow-hidden">
      <AnimatePresence mode='popLayout'>
        {cards.map(card => (
          <FloatingCard 
            key={card.id} 
            card={card} 
            onRecycle={() => handleRecycle(card.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FloatingCard({ card, onRecycle }: { card: CardState, onRecycle: () => void }) {
  
  // Visual Variants (High Res Logic)
  // Base size is now 900px (HIGH_RES_WIDTH)
  // Floating size (300px) corresponds to scale 0.33
  // Spotlight size (900px) corresponds to scale 1.0
  
  const variants: Variants = {
    enter: { 
      opacity: 0, 
      scale: 0.26, // ~0.8 of floating size
      filter: "brightness(0.8) drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
      transition: { duration: 2 }
    },
    floating: { 
      opacity: 0.7, 
      scale: [0.33, 0.5], // Breathing: 300px to 450px
      filter: "brightness(0.8) drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
      transition: {
        scale: { 
          duration: 25, 
          repeat: Infinity, 
          repeatType: "mirror", 
          ease: "easeInOut" 
        },
        opacity: { duration: 2 }
      }
    },
    spotlight: { 
      opacity: 1, 
      scale: 1.0, // Full 900px resolution
      filter: "brightness(1.1) drop-shadow(0 50px 100px rgba(0,0,0,0.7))",
      transition: { 
        duration: 5, 
        ease: "easeInOut" 
      }
    },
    exiting: { 
      opacity: 0, 
      scale: 1.1, // Grow slightly more
      filter: "brightness(1.5) blur(10px)",
      transition: { 
        duration: 4, 
        ease: "easeInOut" 
      }
    }
  };

  return (
    // OUTER WRAPPER: Handles Physics (X/Y) & Z-Index
    <motion.div
      className="absolute top-0 left-0 will-change-transform"
      animate={{
        x: [card.minX, card.maxX],
        y: [card.minY, card.maxY],
      }}
      transition={{
        x: {
          duration: card.durationX,
          ease: "linear",
          repeat: Infinity,
          repeatType: "mirror",
          delay: -card.delayX
        },
        y: {
          duration: card.durationY,
          ease: "linear",
          repeat: Infinity,
          repeatType: "mirror",
          delay: -card.delayY
        }
      }}
      style={{ 
        width: CARD_WIDTH,
        zIndex: card.status === 'spotlight' || card.status === 'exiting' ? 100 : 10 // Fix Z-Index
      }}
    >
      {/* INNER WRAPPER: Handles Visual State & High Res Scaling */}
      <motion.div
        className="absolute top-1/2 left-1/2 origin-center" // Center the high-res content
        style={{ 
          width: HIGH_RES_WIDTH, 
          x: "-50%", 
          y: "-50%" 
        }}
        initial="enter"
        animate={card.status}
        variants={variants}
        onAnimationComplete={() => {
          if (card.status === 'exiting') {
             onRecycle();
          }
        }}
      >
        <img 
          src={`/alumni-cards/${card.image}`} 
          alt="Alumni" 
          className="w-full h-auto object-contain rounded-3xl" // Larger border radius for large size
        />
      </motion.div>
    </motion.div>
  );
}

function createCard(image: string, containerW: number, containerH: number): CardState {
  // Calculate boundaries with Tuned Buffers
  const minX = BUFFER_X;
  const maxX = containerW - CARD_WIDTH - BUFFER_X;
  const minY = BUFFER_TOP;
  const maxY = containerH - EST_CARD_HEIGHT - BUFFER_BOTTOM;

  // Ensure min < max (handle small screens)
  const safeMaxX = Math.max(minX, maxX);
  const safeMaxY = Math.max(minY, maxY);

  // Random durations for independent axes (20s - 40s)
  const durationX = 20 + Math.random() * 20;
  const durationY = 20 + Math.random() * 20;

  const delayX = Math.random() * (2 * durationX);
  const delayY = Math.random() * (2 * durationY);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    image,
    status: 'floating', // Initialize directly to floating
    minX,
    maxX: safeMaxX,
    minY,
    maxY: safeMaxY,
    durationX,
    durationY,
    delayX,
    delayY
  };
}
