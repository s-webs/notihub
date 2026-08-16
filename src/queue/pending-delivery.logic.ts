const LIVE_STATES = new Set(['waiting', 'active', 'delayed', 'paused']);

export function shouldRequeueStuckJob(state: string | undefined): boolean {
  if (!state) {
    return true;
  }
  return !LIVE_STATES.has(state);
}
