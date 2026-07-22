import type { PopupMessage, EnforcementPageMessage, MessageResponse } from '../types/messages';

export async function sendMessage(
  message: PopupMessage | EnforcementPageMessage
): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Message failed',
        });
      } else {
        resolve(response);
      }
    });
  });
}

export async function sendMessageWithTimeout(
  message: PopupMessage | EnforcementPageMessage,
  timeoutMs: number = 5000
): Promise<MessageResponse> {
  return Promise.race([
    sendMessage(message),
    new Promise<MessageResponse>((resolve) =>
      setTimeout(
        () => resolve({ success: false, error: 'Message timeout' }),
        timeoutMs
      )
    ),
  ]);
}
