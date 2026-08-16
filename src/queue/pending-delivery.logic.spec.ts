import { shouldRequeueStuckJob } from './pending-delivery.logic';

describe('shouldRequeueStuckJob', () => {
  it('requeues missing, completed and failed jobs', () => {
    expect(shouldRequeueStuckJob(undefined)).toBe(true);
    expect(shouldRequeueStuckJob('completed')).toBe(true);
    expect(shouldRequeueStuckJob('failed')).toBe(true);
    expect(shouldRequeueStuckJob('unknown')).toBe(true);
  });

  it('leaves live queue states alone', () => {
    expect(shouldRequeueStuckJob('waiting')).toBe(false);
    expect(shouldRequeueStuckJob('active')).toBe(false);
    expect(shouldRequeueStuckJob('delayed')).toBe(false);
    expect(shouldRequeueStuckJob('paused')).toBe(false);
  });
});
