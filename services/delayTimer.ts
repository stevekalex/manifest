// Phase 4: Robust delay timer implementation

export type TimerState = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface DelayTimer {
  start(): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  restart(): void;
  cleanup(): void;
  getState(): TimerState;
  getElapsedTime(): number;
  getRemainingTime(): number;
  isActive(): boolean;
}

export interface DelayTimerOptions {
  onComplete: () => void;
  onCancel?: (elapsed: number) => void;
  onPause?: (elapsed: number) => void;
  onResume?: (elapsed: number) => void;
  enableDriftCompensation?: boolean;
}

class RobustDelayTimer implements DelayTimer {
  private delayMs: number;
  private options: DelayTimerOptions;
  private state: TimerState = 'idle';
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private elapsedBeforePause: number = 0;
  
  constructor(delayMs: number, options: DelayTimerOptions) {
    this.delayMs = Math.max(0, delayMs); // Ensure non-negative
    this.options = options;
  }
  
  start(): void {
    if (this.state !== 'idle' && this.state !== 'cancelled') {
      console.warn('⏱️ [TIMER] Cannot start timer in state:', this.state);
      return;
    }
    
    this.state = 'running';
    this.startTime = Date.now();
    this.elapsedBeforePause = 0;
    
    console.log('⏱️ [TIMER] Starting timer for', this.delayMs, 'ms');
    
    this.scheduleTimeout(this.delayMs);
  }
  
  pause(): void {
    if (this.state !== 'running') {
      console.warn('⏱️ [TIMER] Cannot pause timer in state:', this.state);
      return;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    const elapsed = this.getElapsedTime();
    this.elapsedBeforePause = elapsed;
    this.pausedTime = Date.now();
    this.state = 'paused';
    
    console.log('⏱️ [TIMER] Paused after', elapsed, 'ms');
    this.options.onPause?.(elapsed);
  }
  
  resume(): void {
    if (this.state !== 'paused') {
      console.warn('⏱️ [TIMER] Cannot resume timer in state:', this.state);
      return;
    }
    
    this.state = 'running';
    const remainingTime = this.getRemainingTime();
    
    console.log('⏱️ [TIMER] Resuming with', remainingTime, 'ms remaining');
    this.options.onResume?.(this.elapsedBeforePause);
    
    // If no time remaining, complete immediately
    if (remainingTime <= 0) {
      this.handleComplete();
    } else {
      this.scheduleTimeout(remainingTime);
    }
  }
  
  cancel(): void {
    if (this.state === 'cancelled' || this.state === 'completed') {
      return;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    const elapsed = this.getElapsedTime();
    this.state = 'cancelled';
    
    console.log('⏱️ [TIMER] Cancelled after', elapsed, 'ms');
    this.options.onCancel?.(elapsed);
  }
  
  restart(): void {
    console.log('⏱️ [TIMER] Restarting timer');
    this.cancel();
    this.state = 'idle';
    this.start();
  }
  
  cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state = 'idle';
  }
  
  getState(): TimerState {
    return this.state;
  }
  
  getElapsedTime(): number {
    if (this.state === 'idle' || this.state === 'cancelled') {
      return 0;
    }
    
    if (this.state === 'paused') {
      return this.elapsedBeforePause;
    }
    
    if (this.state === 'completed') {
      return this.delayMs;
    }
    
    // Running state
    return this.elapsedBeforePause + (Date.now() - this.startTime);
  }
  
  getRemainingTime(): number {
    return Math.max(0, this.delayMs - this.getElapsedTime());
  }
  
  isActive(): boolean {
    return this.state === 'running' || this.state === 'paused';
  }
  
  private scheduleTimeout(delayMs: number): void {
    if (this.options.enableDriftCompensation) {
      // Use drift compensation for more accurate timing
      this.scheduleDriftCompensatedTimeout(delayMs);
    } else {
      // Simple setTimeout
      this.timeoutId = setTimeout(() => {
        this.handleComplete();
      }, delayMs);
    }
  }
  
  private scheduleDriftCompensatedTimeout(targetMs: number): void {
    const checkInterval = Math.min(100, targetMs / 10); // Check every 100ms or 10% of target
    const targetTime = Date.now() + targetMs;
    
    const checkTimer = () => {
      const now = Date.now();
      const remaining = targetTime - now;
      
      if (remaining <= 0) {
        this.handleComplete();
      } else if (remaining <= checkInterval) {
        // Final precise timeout
        this.timeoutId = setTimeout(() => {
          this.handleComplete();
        }, remaining);
      } else {
        // Continue checking
        this.timeoutId = setTimeout(checkTimer, checkInterval);
      }
    };
    
    checkTimer();
  }
  
  private handleComplete(): void {
    if (this.state !== 'running') {
      return;
    }
    
    this.state = 'completed';
    const actualDelay = this.getElapsedTime();
    
    console.log('⏱️ [TIMER] Completed after', actualDelay, 'ms (expected:', this.delayMs, 'ms)');
    this.options.onComplete();
  }
}

// Factory function for easy timer creation
export function createDelayTimer(
  delayMs: number, 
  onComplete: () => void,
  options?: Partial<DelayTimerOptions>
): DelayTimer {
  return new RobustDelayTimer(delayMs, {
    onComplete,
    ...options
  });
}

// Simple wrapper for XState integration
export function createDelayTimerForXState(delayMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = createDelayTimer(delayMs, resolve, {
      enableDriftCompensation: true
    });
    
    timer.start();
    
    // Return cleanup function for XState
    return () => {
      timer.cancel();
      timer.cleanup();
    };
  });
}