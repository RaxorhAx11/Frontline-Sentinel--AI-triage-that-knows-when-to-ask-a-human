import { Message } from '../models/Message';
import { messageService } from './message.service';

export interface IBulkTriageStatus {
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed';
  total: number;
  processed: number;
  pending: number;
  processing: number;
  completed: number;
  humanReview: number;
  failed: number;
  invalid: number;
}

class BulkTriageService {
  private status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' = 'idle';
  private total: number = 0;
  private processed: number = 0;
  private stopRequested: boolean = false;
  private pauseRequested: boolean = false;

  /**
   * Returns the current status of bulk triage processing.
   */
  public async getStatus(): Promise<IBulkTriageStatus> {
    const stats = await this.getDbStatusCounts();
    return {
      status: this.status,
      total: this.total,
      processed: this.processed,
      ...stats,
    };
  }

  /**
   * Starts sequential bulk triage processing.
   */
  public async startTriage(): Promise<void> {
    if (this.status === 'running') {
      return;
    }

    this.status = 'running';
    this.stopRequested = false;
    this.pauseRequested = false;

    // Run in background
    this.runProcessingLoop().catch((err) => {
      console.error('Error in bulk triage background loop:', err);
      this.status = 'failed' as any;
    });
  }

  /**
   * Request processing to pause.
   */
  public pause(): void {
    if (this.status === 'running') {
      this.pauseRequested = true;
      this.status = 'paused';
    }
  }

  /**
   * Request processing to stop.
   */
  public stop(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.stopRequested = true;
      this.status = 'stopped';
    }
  }

  /**
   * Resets the bulk triage stats in memory.
   */
  public reset(): void {
    this.status = 'idle';
    this.total = 0;
    this.processed = 0;
  }

  /**
   * Sequential background loop to triage pending messages.
   */
  private async runProcessingLoop(): Promise<void> {
    // Find all pending and failed messages
    const eligibleMessages = await Message.find({
      status: { $in: ['pending', 'failed'] },
    }).sort({ createdAt: 1 });

    this.total = eligibleMessages.length;
    this.processed = 0;

    let consecutive429Count = 0;

    for (const msg of eligibleMessages) {
      if (this.stopRequested) {
        this.status = 'stopped';
        return;
      }
      if (this.pauseRequested) {
        this.status = 'paused';
        return;
      }

      console.log(`[Bulk Triage] Processing message ${this.processed + 1}/${this.total} (ID: ${msg._id})`);

      try {
        // Run triage pipeline
        await messageService.runTriage(msg._id.toString());
        consecutive429Count = 0; // reset on success
      } catch (err: any) {
        console.error(`[Bulk Triage] Failed message ${msg._id}:`, err.message || err);

        // Check if error is persistent rate limit (429)
        const is429 = err.message && (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));
        if (is429) {
          consecutive429Count++;
          if (consecutive429Count >= 3) {
            console.error('[Bulk Triage] Encountered persistent 429 rate limit errors. Safely pausing processing.');
            this.status = 'paused';
            return;
          }
        }
      }

      this.processed++;
      
      // Delay between sequential processing to be free-tier friendly (e.g. 1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.status = 'completed';
  }

  /**
   * Helper to count database message statuses.
   */
  private async getDbStatusCounts() {
    const counts = await Message.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      humanReview: 0,
      invalid: 0,
    };

    counts.forEach((item) => {
      switch (item._id) {
        case 'pending':
          stats.pending = item.count;
          break;
        case 'processing':
          stats.processing = item.count;
          break;
        case 'completed':
          stats.completed = item.count;
          break;
        case 'failed':
          stats.failed = item.count;
          break;
        case 'human_review':
          stats.humanReview = item.count;
          break;
        case 'invalid':
          stats.invalid = item.count;
          break;
      }
    });

    return stats;
  }
}

export const bulkTriageService = new BulkTriageService();
