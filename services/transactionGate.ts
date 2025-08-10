import { EventEmitter } from 'events';

export enum Priority {
  Background = 1,
  Preview = 2,
  Accept = 3,
  Critical = 4
}

interface Operation {
  key: string;
  version: number;
  priority: number;
  promise: Promise<any>;
  startTime: number;
}

export class TransactionGate extends EventEmitter {
  private version = 0;
  private activeOps = new Map<string, number>(); // key -> version
  private previewActive = false;
  private operationTimeout = 5000; // 5 seconds default timeout
  private operationStats = {
    total: 0,
    succeeded: 0,
    preempted: 0,
    failed: 0,
    timedOut: 0
  };
  
  async exec<T>(
    key: string, 
    priority: number, 
    fn: () => Promise<T>,
    timeoutMs: number = this.operationTimeout
  ): Promise<T | null> {
    const opVersion = ++this.version;
    const keyPrefix = key.split(':')[0];
    const startTime = Date.now();
    
    this.operationStats.total++;
    
    console.log(`🔒 Gate v${opVersion}: Starting operation '${key}' with priority ${priority}`);
    
    // Accept preempts preview
    if (keyPrefix === 'accept' && this.previewActive) {
      console.log(`🚫 Gate v${opVersion}: Accept preempting active preview`);
      this.previewActive = false;
      this.emit('preview-preempted', { version: opVersion, key });
    }
    
    // Mark preview as active
    if (keyPrefix === 'preview') {
      this.previewActive = true;
      console.log(`🎭 Gate v${opVersion}: Preview mode activated`);
    }
    
    // Store version for this operation
    this.activeOps.set(key, opVersion);
    
    // Create timeout promise
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Operation ${key} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      // Race between operation and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      // Check if still current version
      if (this.activeOps.get(key) !== opVersion) {
        console.log(`⏭️  Gate v${opVersion}: Operation '${key}' superseded, ignoring result`);
        this.operationStats.preempted++;
        return null;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Gate v${opVersion}: Operation '${key}' completed in ${duration}ms`);
      this.operationStats.succeeded++;
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Check if this was a timeout
      if (error instanceof Error && error.message.includes('timed out')) {
        console.error(`⏰ Gate v${opVersion}: Operation '${key}' timed out after ${duration}ms`);
        this.operationStats.timedOut++;
      } else {
        console.error(`❌ Gate v${opVersion}: Operation '${key}' failed after ${duration}ms:`, error);
        this.operationStats.failed++;
      }
      
      // Still check version on error
      if (this.activeOps.get(key) === opVersion) {
        throw error;
      }
      return null;
      
    } finally {
      // Always clear the timeout to avoid stray rejections
      if (timerId) {
        clearTimeout(timerId);
      }
      
      // Clean up if still current
      if (this.activeOps.get(key) === opVersion) {
        this.activeOps.delete(key);
        
        if (keyPrefix === 'preview') {
          this.previewActive = false;
          console.log(`🎭 Gate v${opVersion}: Preview mode deactivated`);
        }
        
        console.log(`🔓 Gate v${opVersion}: Released operation '${key}'`);
      }
    }
  }
  
  isPreviewActive(): boolean {
    return this.previewActive;
  }
  
  getCurrentVersion(): number {
    return this.version;
  }
  
  getActiveOperations(): string[] {
    return Array.from(this.activeOps.keys());
  }
  
  getOperationStats() {
    return { ...this.operationStats };
  }
  
  resetStats() {
    this.operationStats = {
      total: 0,
      succeeded: 0,
      preempted: 0,
      failed: 0,
      timedOut: 0
    };
    console.log('📊 Gate: Statistics reset');
  }
  
  // Emergency cleanup - cancels all operations
  emergencyStop() {
    console.log('🚨 Gate: Emergency stop - clearing all operations');
    this.activeOps.clear();
    this.previewActive = false;
    this.emit('emergency-stop');
  }
}

// Singleton instance
export const gate = new TransactionGate();