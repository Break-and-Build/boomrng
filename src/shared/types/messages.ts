export type PopupMessage =
  | { type: 'REFRESH_RULES' }
  | { type: 'UPDATE_BADGE' }
  | { type: 'VALIDATE_PIN'; pin: string }
  | { type: 'GET_TAB_COUNT' }
  | { type: 'SET_STRICT_MODE'; active: boolean };

export type EnforcementMessage =
  | { type: 'PIN_VALID'; domain: string }
  | { type: 'PIN_INVALID'; domain: string }
  | { type: 'DELAY_EXPIRED'; domain: string };

export type EnforcementPageMessage =
  | { type: 'VALIDATE_PIN'; pin: string; domain: string }
  | { type: 'REQUEST_CONTINUE'; domain: string }
  | { type: 'GET_DELAY_WINDOW'; domain: string }
  | { type: 'GET_CAPTURED_DESTINATION'; cid: string }
  | { type: 'TAB_CLOSED'; tabId: number };

export type MessageResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string };
