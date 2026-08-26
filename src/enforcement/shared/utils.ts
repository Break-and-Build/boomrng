export function getUrlParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export function getOriginalUrl(): string | null {
  const original = getUrlParam('original');
  if (original) return original;

  const domain = getUrlParam('domain');
  if (domain) return `https://${domain}`;

  return null;
}

export function getDomain(): string | null {
  return getUrlParam('domain');
}

export function getBehavior(): string | null {
  return getUrlParam('behavior');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendMessage(message: Record<string, any>): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      resolve(response);
    });
  });
}

export function goBackToOriginal(): void {
  const original = getOriginalUrl();
  if (original) {
    window.location.href = original;
  } else {
    window.history.back();
  }
}
