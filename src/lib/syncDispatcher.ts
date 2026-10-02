// Utility to broadcast updates locally (via BroadcastChannel) AND remotely (via SSE API)

export function dispatchSyncUpdate(
  broadcastChannel: BroadcastChannel | null, 
  action: string, 
  payload: any
) {
  // 1. Local broadcast (for detached HUDs on the same computer)
  if (broadcastChannel) {
    if (action === 'addOrUpdateQA') {
      broadcastChannel.postMessage({ type: 'NEW_QA', qa: payload.qa });
    } else if (action === 'setLiveTranscript') {
      broadcastChannel.postMessage({ type: 'TRANSCRIPT_UPDATE', transcript: payload.text });
    } else if (action === 'syncAll') {
      broadcastChannel.postMessage({ 
        type: 'SYNC_ALL', 
        qas: payload.qas, 
        isCapturing: payload.isCapturing,
        sttStatus: payload.sttStatus
      });
    }
  }

  // 2. Remote broadcast (for Mobile Companion via SSE)
  // Fire and forget fetch
  if (typeof window !== 'undefined') {
    fetch('/api/sync/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    }).catch(console.error);
  }
}
