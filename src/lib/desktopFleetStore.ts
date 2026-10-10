import { createHash } from 'crypto';

export interface DesktopNode {
  nodeId: string;
  userId: string;
  userEmail: string;
  userPlan: string;
  appVersion: string;
  platform: 'darwin' | 'win32' | 'linux' | string;
  state: 'launcher' | 'stealth' | 'ticker';
  isCapturing: boolean;
  sttStatus: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
  micStatus: 'active' | 'muted' | 'error';
  audioLatencyMs: number;
  ip?: string;
  lastSeen: number;
  startedAt: number;
}

export interface DesktopFleetStats {
  totalNodes: number;
  onlineNodes: number;
  inSessionNodes: number;
  osBreakdown: {
    macos: number;
    windows: number;
    linux: number;
  };
  avgLatencyMs: number;
  activeVersions: Record<string, number>;
}

// In-memory global store to survive hot-reloading in dev
const g = globalThis as unknown as {
  __desktopNodes?: Map<string, DesktopNode>;
};

const desktopNodes = g.__desktopNodes || (g.__desktopNodes = new Map<string, DesktopNode>());

// 45 seconds timeout before considering node offline
const NODE_OFFLINE_THRESHOLD_MS = 45000;

export function registerOrUpdateDesktopNode(data: {
  nodeId?: string;
  userId: string;
  userEmail: string;
  userPlan?: string;
  appVersion?: string;
  platform?: string;
  state?: 'launcher' | 'stealth' | 'ticker';
  isCapturing?: boolean;
  sttStatus?: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
  micStatus?: 'active' | 'muted' | 'error';
  audioLatencyMs?: number;
  ip?: string;
}): DesktopNode {
  const now = Date.now();
  // If no nodeId provided, generate deterministic or random node ID
  const nodeId = data.nodeId || createHash('sha256').update(`${data.userId}-${data.platform}-${data.ip || ''}`).digest('hex').slice(0, 12);

  const existing = desktopNodes.get(nodeId);

  const node: DesktopNode = {
    nodeId,
    userId: data.userId,
    userEmail: data.userEmail,
    userPlan: data.userPlan || existing?.userPlan || 'pro',
    appVersion: data.appVersion || existing?.appVersion || '1.0.0',
    platform: data.platform || existing?.platform || 'unknown',
    state: data.state || existing?.state || 'launcher',
    isCapturing: data.isCapturing ?? existing?.isCapturing ?? false,
    sttStatus: data.sttStatus || existing?.sttStatus || 'idle',
    micStatus: data.micStatus || existing?.micStatus || 'active',
    audioLatencyMs: data.audioLatencyMs ?? existing?.audioLatencyMs ?? 28,
    ip: data.ip || existing?.ip,
    lastSeen: now,
    startedAt: existing?.startedAt || now,
  };

  desktopNodes.set(nodeId, node);
  return node;
}

export function removeDesktopNode(nodeId: string): boolean {
  return desktopNodes.delete(nodeId);
}

export function getDesktopNode(nodeId: string): DesktopNode | undefined {
  return desktopNodes.get(nodeId);
}

export function listDesktopNodes(): DesktopNode[] {
  const now = Date.now();
  const nodes = Array.from(desktopNodes.values());
  // Sort: online first, then by lastSeen desc
  return nodes.sort((a, b) => {
    const aOnline = now - a.lastSeen < NODE_OFFLINE_THRESHOLD_MS;
    const bOnline = now - b.lastSeen < NODE_OFFLINE_THRESHOLD_MS;
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return b.lastSeen - a.lastSeen;
  });
}

export function getDesktopFleetStats(): DesktopFleetStats {
  const now = Date.now();
  const allNodes = Array.from(desktopNodes.values());
  const onlineNodes = allNodes.filter((n) => now - n.lastSeen < NODE_OFFLINE_THRESHOLD_MS);
  const inSessionNodes = onlineNodes.filter((n) => n.state === 'stealth' || n.state === 'ticker' || n.isCapturing);

  const osBreakdown = { macos: 0, windows: 0, linux: 0 };
  const activeVersions: Record<string, number> = {};
  let totalLatency = 0;
  let latencySamples = 0;

  for (const node of onlineNodes) {
    const plat = (node.platform || '').toLowerCase();
    if (plat.includes('darwin') || plat.includes('mac')) {
      osBreakdown.macos++;
    } else if (plat.includes('win')) {
      osBreakdown.windows++;
    } else {
      osBreakdown.linux++;
    }

    if (node.appVersion) {
      activeVersions[node.appVersion] = (activeVersions[node.appVersion] || 0) + 1;
    }

    if (typeof node.audioLatencyMs === 'number' && node.audioLatencyMs > 0) {
      totalLatency += node.audioLatencyMs;
      latencySamples++;
    }
  }

  const avgLatencyMs = latencySamples > 0 ? Math.round(totalLatency / latencySamples) : 24;

  return {
    totalNodes: allNodes.length,
    onlineNodes: onlineNodes.length,
    inSessionNodes: inSessionNodes.length,
    osBreakdown,
    avgLatencyMs,
    activeVersions,
  };
}

export function cleanupStaleDesktopNodes(maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, node] of desktopNodes.entries()) {
    if (now - node.lastSeen > maxAgeMs) {
      desktopNodes.delete(id);
    }
  }
}
