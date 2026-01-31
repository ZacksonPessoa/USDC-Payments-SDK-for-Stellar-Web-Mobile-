import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentMonitor } from './paymentMonitor';
import { PersistenceAdapter } from './persistence';

// Mock Stellar SDK
const mockBuilder = {
  forAccount: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  cursor: vi.fn().mockReturnThis(),
  call: vi.fn().mockResolvedValue({ records: [] })
};

vi.mock('stellar-sdk', () => {
  return {
    Horizon: {
      Server: class {
        payments() { return mockBuilder; }
      }
    },
    hash: (b: any) => b
  };
});

describe('PaymentMonitor Locking', () => {
  let mockDb: PersistenceAdapter;
  let monitor: PaymentMonitor;

  beforeEach(() => {
    mockDb = {
      init: vi.fn(),
      savePayment: vi.fn(),
      getPendingPayments: vi.fn(),
      updatePaymentStatus: vi.fn(),
      deletePayment: vi.fn(),
      markHashProcessed: vi.fn(),
      isHashProcessed: vi.fn(),
      getCursor: vi.fn().mockResolvedValue('100'), // Return explicit cursor to avoid initialization logic
      saveCursor: vi.fn(),
      cleanup: vi.fn(),
      acquireLock: vi.fn(),
      releaseLock: vi.fn()
    } as any;

    monitor = new PaymentMonitor("TESTNET", "G...", { url: "http://ex.com", secret: "s" }, {
        adapter: mockDb,
        pollIntervalMs: 10, // Fast polling
        lockTtlMs: 100
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.clearAllMocks();
  });

  it('should acquire lock before checking transactions', async () => {
    (mockDb.acquireLock as any).mockResolvedValue(true);

    // Start monitor
    const promise = monitor.start();

    // Wait a bit
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    await promise;

    expect(mockDb.acquireLock).toHaveBeenCalledWith('monitor_lock', 100, expect.any(String));
    // checkTransactions should be called, which calls builder methods
    expect(mockBuilder.call).toHaveBeenCalled();
    expect(mockDb.releaseLock).toHaveBeenCalledWith('monitor_lock', expect.any(String));
  });

  it('should skip cycle if lock not acquired', async () => {
    (mockDb.acquireLock as any).mockResolvedValue(false);

    // Start monitor
    const promise = monitor.start();

    // Wait a bit
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    await promise;

    expect(mockDb.acquireLock).toHaveBeenCalled();
    // Should NOT have called saveCursor (part of transaction check loop)
    expect(mockDb.saveCursor).not.toHaveBeenCalled();
    expect(mockDb.releaseLock).not.toHaveBeenCalled();
  });
});
