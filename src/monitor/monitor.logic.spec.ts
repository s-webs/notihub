import { ReadyStatus } from '../health/health.service';
import { formatReadyAlert, readyTransition } from './monitor.logic';

describe('readyTransition', () => {
  const down: ReadyStatus = { status: 'error', postgres: false, redis: true };
  const up: ReadyStatus = { status: 'ok', postgres: true, redis: true };

  it('alerts on first failure', () => {
    expect(readyTransition(false, down)).toBe('down');
  });

  it('does not repeat while still down', () => {
    expect(readyTransition(true, down)).toBeNull();
  });

  it('alerts on recovery', () => {
    expect(readyTransition(true, up)).toBe('recovered');
  });

  it('stays quiet while healthy', () => {
    expect(readyTransition(false, up)).toBeNull();
  });

  it('formats a dependency alert', () => {
    expect(formatReadyAlert(down)).toContain('Postgres:');
    expect(formatReadyAlert(down)).toContain('FAIL');
  });
});
