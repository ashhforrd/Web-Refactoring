import type { OutboxRepository } from '@relaydesk/db';

export interface Delivery {
  send(kind: string, payload: unknown): Promise<void>;
}

export class OutboxWorker {
  constructor(
    private outbox: OutboxRepository,
    private delivery: Delivery,
  ) {}

  async runOnce() {
    for (const item of this.outbox.pending()) {
      try {
        await this.delivery.send(item.kind, JSON.parse(item.payload));

        this.outbox.markDone(item.id);
      } catch {
        this.outbox.markFailed(item.id);
      }
    }
  }
}
