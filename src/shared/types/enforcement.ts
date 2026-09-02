export type EnforcementAction =
  | { type: 'allow' }
  | { type: 'checkpoint'; domain: string }
  | { type: 'delay'; domain: string; remainingMs: number }
  | { type: 'pin-required'; domain: string }
  | { type: 'reflection'; domain: string }
  | { type: 'hard-block'; domain: string }
  | { type: 'custom-message'; domain: string; message: string };
