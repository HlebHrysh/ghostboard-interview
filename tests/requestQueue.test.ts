import { describe, it, expect, vi } from 'vitest';
import { RequestQueueWithBackpressure } from '../src/hooks/useRecordingPipeline';

describe('RequestQueueWithBackpressure', () => {
  it('executes tasks with concurrency: 1 sequentially', async () => {
    const order: number[] = [];
    const worker = vi.fn().mockImplementation(async (id: number) => {
      order.push(id);
      await new Promise((resolve) => setTimeout(resolve, 20));
      return `result-${id}`;
    });

    const queue = new RequestQueueWithBackpressure<number, string>({
      concurrency: 1,
      maxQueueSize: 2,
      worker,
    });

    const p1 = queue.enqueue(1);
    const p2 = queue.enqueue(2);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('result-1');
    expect(r2).toBe('result-2');
    expect(order).toEqual([1, 2]);
  });

  it('drops the oldest pending item when queue reaches capacity (maxQueueSize = 2)', async () => {
    let unblockWorker: () => void = () => {};
    const worker = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          unblockWorker = () => resolve('done');
        })
    );

    const queue = new RequestQueueWithBackpressure<string, string>({
      concurrency: 1,
      maxQueueSize: 2,
      worker,
    });

    // 1st request starts executing immediately (activeCount = 1)
    const p1 = queue.enqueue('Q1');
    expect(queue.isBusy).toBe(true);
    expect(queue.pendingCount).toBe(0);

    // 2nd request enters queue (pendingCount = 1)
    const p2 = queue.enqueue('Q2');
    expect(queue.pendingCount).toBe(1);

    // 3rd request enters queue (pendingCount = 2, full!)
    const p3 = queue.enqueue('Q3');
    expect(queue.pendingCount).toBe(2);

    // 4th request enters queue -> queue capacity (2) exceeded!
    // Q2 (oldest pending) must be DROPPED, Q3 and Q4 remain pending
    let p2Error: Error | null = null;
    const p2Catch = p2.catch((err) => {
      p2Error = err;
    });

    const p4 = queue.enqueue('Q4');
    await p2Catch;

    expect(p2Error).toBeInstanceOf(Error);
    expect((p2Error as unknown as Error).message).toContain('Dropped from queue: superseded by newer interviewer question');
    expect(queue.pendingCount).toBe(2); // Q3 and Q4

    // Complete the first task
    unblockWorker();
    await p1;
  });

  it('rejects pending requests when clear() is called', async () => {
    const worker = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const queue = new RequestQueueWithBackpressure<number, string>({
      concurrency: 1,
      maxQueueSize: 2,
      worker,
    });

    // In flight
    void queue.enqueue(1);
    // Queued
    const p2 = queue.enqueue(2);
    let p2Error: Error | null = null;
    p2.catch((err) => {
      p2Error = err;
    });

    queue.clear();
    await new Promise((r) => setTimeout(r, 10));

    expect(p2Error).toBeInstanceOf(Error);
    expect((p2Error as unknown as Error).message).toBe('Queue cleared');
    expect(queue.pendingCount).toBe(0);
  });

  it('propagates worker errors without breaking subsequent queue processing', async () => {
    let failFirst = true;
    const worker = vi.fn().mockImplementation(async (n: number) => {
      if (failFirst && n === 1) {
        failFirst = false;
        throw new Error('Worker crash');
      }
      return n * 10;
    });

    const queue = new RequestQueueWithBackpressure<number, number>({
      concurrency: 1,
      maxQueueSize: 2,
      worker,
    });

    await expect(queue.enqueue(1)).rejects.toThrow('Worker crash');
    const res2 = await queue.enqueue(2);
    expect(res2).toBe(20);
  });
});
