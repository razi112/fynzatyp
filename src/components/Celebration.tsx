import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Crown } from 'lucide-react';

interface CelebrationProps {
  type: 'complete' | 'newRecord' | 'milestone';
  wpm?: number;
  accuracy?: number;
  message?: string;
  onComplete?: () => void;
}

export function Celebration({ type, wpm, accuracy, message, onComplete }: CelebrationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Trigger confetti based on celebration type
    if (type === 'newRecord') {
      // Big celebration for new records
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#3b82f6', '#22c55e', '#eab308'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#a855f7', '#3b82f6', '#22c55e', '#eab308'],
        });
      }, 50);

      // Star burst from center
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ffb700', '#ff9500'],
      });
    } else if (type === 'complete') {
      // Standard completion celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#3b82f6', '#a855f7'],
      });
    } else if (type === 'milestone') {
      // Smaller celebration for milestones
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.7 },
      });
    }

    // Auto-hide after animation
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, type === 'newRecord' ? 4000 : 2500);

    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'newRecord':
        return <Crown className="h-12 w-12 text-yellow-400" />;
      case 'complete':
        return <Trophy className="h-12 w-12 text-primary" />;
      case 'milestone':
        return <Star className="h-12 w-12 text-yellow-500" />;
      default:
        return <Zap className="h-12 w-12 text-primary" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'newRecord':
        return '🏆 New Personal Best!';
      case 'complete':
        return '🎉 Challenge Complete!';
      case 'milestone':
        return '⭐ Milestone Achieved!';
      default:
        return 'Great Job!';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.1, 1] }}
            transition={{ duration: 0.5, times: [0, 0.5, 1] }}
            className="bg-card/95 backdrop-blur-sm border-2 border-primary/50 rounded-2xl p-8 shadow-glow text-center max-w-sm mx-4"
          >
            <motion.div
              animate={{ 
                rotate: type === 'newRecord' ? [0, -10, 10, -10, 10, 0] : 0,
                scale: type === 'newRecord' ? [1, 1.2, 1] : 1 
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              {getIcon()}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {getTitle()}
            </h2>
            
            {message && (
              <p className="text-muted-foreground mb-4">{message}</p>
            )}
            
            {(wpm !== undefined || accuracy !== undefined) && (
              <div className="flex justify-center gap-6 mt-4">
                {wpm !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-primary">{wpm}</div>
                    <div className="text-sm text-muted-foreground">WPM</div>
                  </motion.div>
                )}
                {accuracy !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-success">{accuracy}%</div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Mini celebration for inline feedback
export function MiniCelebration({ text }: { text: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 10 }}
      className="inline-flex items-center gap-1 text-success font-medium"
    >
      <Zap className="h-4 w-4" />
      {text}
    </motion.span>
  );
}
