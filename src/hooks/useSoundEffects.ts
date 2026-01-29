import { useCallback, useRef } from 'react';

type SoundType = 'keypress' | 'error' | 'complete' | 'newRecord' | 'countdown';

const SOUND_CONFIG: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
  keypress: { frequency: 800, duration: 30, type: 'sine', volume: 0.1 },
  error: { frequency: 200, duration: 100, type: 'square', volume: 0.15 },
  complete: { frequency: 523, duration: 200, type: 'sine', volume: 0.2 },
  newRecord: { frequency: 659, duration: 150, type: 'sine', volume: 0.25 },
  countdown: { frequency: 440, duration: 100, type: 'sine', volume: 0.15 },
};

export function useSoundEffects(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      const config = SOUND_CONFIG[type];
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration / 1000);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, [enabled, getAudioContext]);

  const playMelody = useCallback((notes: number[], duration: number = 150) => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      
      notes.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        
        const startTime = ctx.currentTime + (index * duration) / 1000;
        const endTime = startTime + duration / 1000;
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
      });
    } catch (e) {
      console.warn('Melody playback failed:', e);
    }
  }, [enabled, getAudioContext]);

  const playVictoryFanfare = useCallback(() => {
    // C5, E5, G5, C6 - victory chord progression
    playMelody([523, 659, 784, 1047], 120);
  }, [playMelody]);

  const playNewRecordFanfare = useCallback(() => {
    // More elaborate: C5, D5, E5, F5, G5, A5, B5, C6
    playMelody([523, 587, 659, 698, 784, 880, 988, 1047], 80);
  }, [playMelody]);

  return {
    playSound,
    playMelody,
    playVictoryFanfare,
    playNewRecordFanfare,
  };
}
