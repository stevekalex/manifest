// Phase 4: Delay timer manager with app state handling
import { AppState, AppStateStatus } from 'react-native';
import { DelayTimer, createDelayTimer } from './delayTimer';

export class DelayTimerManager {
  private currentTimer: DelayTimer | null = null;
  private appStateSubscription: any;
  private wasRunningBeforeBackground = false;

  constructor() {
    this.setupAppStateHandling();
  }

  private setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('📱 [TIMER-MANAGER] App state changed to:', nextAppState);
    
    if (!this.currentTimer) return;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Going to background - pause timer if running
      if (this.currentTimer.getState() === 'running') {
        this.wasRunningBeforeBackground = true;
        console.log('📱 [TIMER-MANAGER] Pausing timer for background');
        this.currentTimer.pause();
      } else {
        this.wasRunningBeforeBackground = false;
      }
    } else if (nextAppState === 'active') {
      // Coming to foreground - resume if was running
      if (this.wasRunningBeforeBackground && this.currentTimer.getState() === 'paused') {
        console.log('📱 [TIMER-MANAGER] Resuming timer from background');
        this.currentTimer.resume();
        this.wasRunningBeforeBackground = false;
      }
    }
  }

  createManagedTimer(
    delayMs: number,
    onComplete: () => void,
    options?: {
      onCancel?: (elapsed: number) => void;
      enableDriftCompensation?: boolean;
    }
  ): DelayTimer {
    // Clean up any existing timer
    if (this.currentTimer) {
      this.currentTimer.cleanup();
    }

    // Create new timer with background handling
    this.currentTimer = createDelayTimer(delayMs, () => {
      onComplete();
      this.currentTimer = null;
    }, {
      ...options,
      onCancel: (elapsed) => {
        options?.onCancel?.(elapsed);
        this.currentTimer = null;
      }
    });

    return this.currentTimer;
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.currentTimer) {
      this.currentTimer.cleanup();
      this.currentTimer = null;
    }
  }
}

// Singleton instance for XState integration
let timerManagerInstance: DelayTimerManager | null = null;

export function getDelayTimerManager(): DelayTimerManager {
  if (!timerManagerInstance) {
    timerManagerInstance = new DelayTimerManager();
  }
  return timerManagerInstance;
}