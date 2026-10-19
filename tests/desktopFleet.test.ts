import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  registerOrUpdateDesktopNode,
  getDesktopFleetStats,
  listDesktopNodes,
  removeDesktopNode,
  getDesktopNode,
} from '../src/lib/desktopFleetStore';
import { POST as heartbeatPost } from '../src/app/api/desktop/heartbeat/route';
import { GET as adminDesktopGet } from '../src/app/api/admin/desktop/route';

describe('Desktop Fleet & Telemetry Store', () => {
  it('registers and updates a desktop node', () => {
    const node = registerOrUpdateDesktopNode({
      nodeId: 'test-node-1',
      userId: 'user-123',
      userEmail: 'dev@ghostboard.ai',
      userPlan: 'pro',
      appVersion: '1.2.0',
      platform: 'darwin',
      state: 'launcher',
      isCapturing: false,
      audioLatencyMs: 22,
    });

    expect(node.nodeId).toBe('test-node-1');
    expect(node.userEmail).toBe('dev@ghostboard.ai');
    expect(node.state).toBe('launcher');

    // Update state to stealth
    const updated = registerOrUpdateDesktopNode({
      nodeId: 'test-node-1',
      userId: 'user-123',
      userEmail: 'dev@ghostboard.ai',
      state: 'stealth',
      isCapturing: true,
      audioLatencyMs: 19,
    });

    expect(updated.state).toBe('stealth');
    expect(updated.isCapturing).toBe(true);
    expect(updated.audioLatencyMs).toBe(19);
  });

  it('calculates fleet statistics with OS breakdown', () => {
    registerOrUpdateDesktopNode({
      nodeId: 'node-mac',
      userId: 'u1',
      userEmail: 'u1@ghostboard.ai',
      platform: 'darwin',
      state: 'stealth',
      audioLatencyMs: 20,
    });
    registerOrUpdateDesktopNode({
      nodeId: 'node-win',
      userId: 'u2',
      userEmail: 'u2@ghostboard.ai',
      platform: 'win32',
      state: 'launcher',
      audioLatencyMs: 30,
    });

    const stats = getDesktopFleetStats();
    expect(stats.totalNodes).toBeGreaterThanOrEqual(2);
    expect(stats.onlineNodes).toBeGreaterThanOrEqual(2);
    expect(stats.osBreakdown.macos).toBeGreaterThanOrEqual(1);
    expect(stats.osBreakdown.windows).toBeGreaterThanOrEqual(1);
    expect(stats.avgLatencyMs).toBeGreaterThan(0);
  });

  it('processes heartbeat POST endpoint successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/desktop/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodeId: 'live-test-node',
        appVersion: '2.0.0',
        platform: 'win32',
        state: 'ticker',
        isCapturing: true,
        sttStatus: 'connected',
        audioLatencyMs: 16,
      }),
    });

    const res = await heartbeatPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.nodeId).toBe('live-test-node');
    expect(data.cloudSync).toBeDefined();

    const stored = getDesktopNode('live-test-node');
    expect(stored).toBeDefined();
    expect(stored?.state).toBe('ticker');
  });

  it('revokes a desktop node from the fleet', () => {
    expect(getDesktopNode('test-node-1')).toBeDefined();
    const removed = removeDesktopNode('test-node-1');
    expect(removed).toBe(true);
    expect(getDesktopNode('test-node-1')).toBeUndefined();
  });

  it('enforces bounded capacity to prevent memory exhaustion DoS', () => {
    // Fill up to cap + 50 nodes
    for (let i = 0; i < 2550; i++) {
      registerOrUpdateDesktopNode({
        nodeId: `cap-node-${i}`,
        userId: `user-${i}`,
        userEmail: `user${i}@test.com`,
      });
    }

    const stats = getDesktopFleetStats();
    // Must not exceed MAX_DESKTOP_NODES (2500)
    expect(stats.totalNodes).toBeLessThanOrEqual(2500);

    // Clean up test nodes to avoid leaking memory into subsequent tests
    for (let i = 0; i < 2550; i++) {
      removeDesktopNode(`cap-node-${i}`);
    }
  });
});
