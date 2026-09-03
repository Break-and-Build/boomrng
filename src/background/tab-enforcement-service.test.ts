import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import type { Constraint, ConstraintBehavior } from '../shared/types/constraint';
import { extractHttpHost, shouldReloadTab, checkAndEnforceTab } from './tab-enforcement-service';
import { grantContinuation, handleNavigationComplete, invalidateDocumentClearance } from './continuation-service';
import { mintPinAuthorization } from './pin-authorization-service';
import { resolveDelayWindow } from './delay-authority-service';

function makeConstraint(domain: string, behavior: ConstraintBehavior, overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: `c-${domain}`,
    domain,
    behavior,
    delayMinutes: behavior === 'delay' ? 1 : null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

describe('extractHttpHost', () => {
  it('normalizes a plain https URL to its host', () => {
    expect(extractHttpHost('https://youtube.com/watch?v=abc123')).toBe('youtube.com');
  });

  it('normalizes a plain http URL to its host', () => {
    expect(extractHttpHost('http://example.com/')).toBe('example.com');
  });

  it('strips www the same way normalizeDomain does everywhere else', () => {
    expect(extractHttpHost('https://www.example.com/path')).toBe('example.com');
  });

  it('returns null for a chrome:// page', () => {
    expect(extractHttpHost('chrome://extensions')).toBeNull();
  });

  it('returns null for the extension’s own chrome-extension:// pages', () => {
    expect(extractHttpHost('chrome-extension://abcdefgh/dist/src/enforcement/checkpoint/index.html?cid=1')).toBeNull();
  });

  it('returns null for a file:// URL', () => {
    expect(extractHttpHost('file:///Users/me/notes.html')).toBeNull();
  });

  it('returns null for undefined (a tab with no readable url)', () => {
    expect(extractHttpHost(undefined)).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(extractHttpHost('not a url at all')).toBeNull();
  });
});

describe('shouldReloadTab', () => {
  it('never reloads when no constraint matches', () => {
    expect(shouldReloadTab(null, false)).toBe(false);
    expect(shouldReloadTab(null, true)).toBe(false);
  });

  it('reloads a matching constraint that has not been cleared', () => {
    expect(shouldReloadTab(makeConstraint('example.com', 'checkpoint'), false)).toBe(true);
  });

  it('does not reload a matching constraint that has been cleared for this exact tab', () => {
    expect(shouldReloadTab(makeConstraint('example.com', 'checkpoint'), true)).toBe(false);
  });
});

describe('checkAndEnforceTab', () => {
  let mock: ChromeMockHandle;
  let tabUrls: Record<number, string>;
  let reloadedTabIds: number[];

  beforeEach(() => {
    vi.useFakeTimers();
    mock = installChromeMock({
      constraints: [],
      settings: { pin: '1234', tabBudget: 10, allowedSites: [], schemaVersion: 1 },
    });
    tabUrls = {};
    reloadedTabIds = [];
    (globalThis as unknown as { chrome: { tabs: unknown } }).chrome.tabs = {
      get: (tabId: number) => Promise.resolve({ id: tabId, url: tabUrls[tabId] } as chrome.tabs.Tab),
      reload: (tabId: number) => {
        reloadedTabIds.push(tabId);
        return Promise.resolve();
      },
    };
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.useRealTimers();
  });

  // Each test uses its own, never-reused tabId — `documentClearance` lives
  // in `continuation-service.ts` and persists across tests in this file
  // (only the chrome mock and local tabUrls/reloadedTabIds are reset per
  // test), so a shared tabId would let one test's clearance leak into the
  // next.

  it('reloads a pre-existing tab matching a live Checkpoint constraint', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    tabUrls[201] = 'https://example.com/';
    await checkAndEnforceTab(201);
    expect(reloadedTabIds).toEqual([201]);
  });

  it('reloads a pre-existing tab matching a live Delay constraint', async () => {
    mock.store.constraints = [makeConstraint('delay.example', 'delay')];
    tabUrls[202] = 'https://delay.example/';
    await checkAndEnforceTab(202);
    expect(reloadedTabIds).toEqual([202]);
  });

  it('reloads a pre-existing tab matching a live PIN Required constraint', async () => {
    mock.store.constraints = [makeConstraint('pin.example', 'pin-required')];
    tabUrls[203] = 'https://pin.example/';
    await checkAndEnforceTab(203);
    expect(reloadedTabIds).toEqual([203]);
  });

  it('reloads a pre-existing tab matching a live Hard Block constraint', async () => {
    mock.store.constraints = [makeConstraint('blocked.example', 'hard-block')];
    tabUrls[204] = 'https://blocked.example/';
    await checkAndEnforceTab(204);
    expect(reloadedTabIds).toEqual([204]);
  });

  it('does not reload when no constraint matches the tab’s domain', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    tabUrls[205] = 'https://unrelated.example/';
    await checkAndEnforceTab(205);
    expect(reloadedTabIds).toEqual([]);
  });

  it('ignores a chrome-extension:// tab (already on its own enforcement page)', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    tabUrls[206] = 'chrome-extension://abcdefgh/dist/src/enforcement/checkpoint/index.html?cid=c-example.com';
    await checkAndEnforceTab(206);
    expect(reloadedTabIds).toEqual([]);
  });

  it('ignores a chrome:// internal page', async () => {
    tabUrls[207] = 'chrome://extensions';
    await checkAndEnforceTab(207);
    expect(reloadedTabIds).toEqual([]);
  });

  it('does not reload a tab that already cleared this exact Checkpoint constraint', async () => {
    const constraint = makeConstraint('example.com', 'checkpoint');
    mock.store.constraints = [constraint];
    tabUrls[208] = 'https://example.com/';

    const granted = await grantContinuation({ domain: 'example.com', tabId: 208 });
    expect(granted.success).toBe(true);
    await handleNavigationComplete(208); // consumes the grant, establishes document clearance

    await checkAndEnforceTab(208);
    expect(reloadedTabIds).toEqual([]);
  });

  it('does not reload a tab that already cleared this exact Delay constraint', async () => {
    const constraint = makeConstraint('delay.example', 'delay');
    mock.store.constraints = [constraint];
    tabUrls[209] = 'https://delay.example/';

    await resolveDelayWindow('delay.example', constraint);
    await vi.advanceTimersByTimeAsync(60_001); // elapse the 1-minute window
    const granted = await grantContinuation({ domain: 'delay.example', tabId: 209 });
    expect(granted.success).toBe(true);
    await handleNavigationComplete(209);

    await checkAndEnforceTab(209);
    expect(reloadedTabIds).toEqual([]);
  });

  it('does not reload a tab that already cleared this exact PIN Required constraint', async () => {
    const constraint = makeConstraint('pin.example', 'pin-required');
    mock.store.constraints = [constraint];
    tabUrls[210] = 'https://pin.example/';

    mintPinAuthorization(210, 'pin.example', constraint.id);
    const granted = await grantContinuation({ domain: 'pin.example', tabId: 210 });
    expect(granted.success).toBe(true);
    await handleNavigationComplete(210);

    await checkAndEnforceTab(210);
    expect(reloadedTabIds).toEqual([]);
  });

  it('Hard Block is reloaded on every activation regardless of clearance — continuation can never be granted for it in the first place', async () => {
    const constraint = makeConstraint('blocked.example', 'hard-block');
    mock.store.constraints = [constraint];
    tabUrls[211] = 'https://blocked.example/';

    const granted = await grantContinuation({ domain: 'blocked.example', tabId: 211 });
    expect(granted.success).toBe(false); // sanity: Hard Block is never continuation-eligible
    await handleNavigationComplete(211); // no grant existed to consume — must not manufacture clearance

    await checkAndEnforceTab(211);
    expect(reloadedTabIds).toEqual([211]);
  });

  it('a subsequent \'loading\' navigation invalidates the clearance, so the tab is reloaded again on the next activation', async () => {
    const constraint = makeConstraint('example.com', 'checkpoint');
    mock.store.constraints = [constraint];
    tabUrls[212] = 'https://example.com/';

    const granted = await grantContinuation({ domain: 'example.com', tabId: 212 });
    expect(granted.success).toBe(true);
    await handleNavigationComplete(212);

    await checkAndEnforceTab(212);
    expect(reloadedTabIds).toEqual([]); // cleared, no reload yet

    invalidateDocumentClearance(212); // service-worker.ts calls this on status:'loading'
    await checkAndEnforceTab(212);
    expect(reloadedTabIds).toEqual([212]);
  });
});
