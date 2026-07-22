import { useState, useEffect } from 'react';

function shouldExcludeTab(tab: chrome.tabs.Tab): boolean {
  if (tab.url?.startsWith('chrome://')) return true;
  if (tab.url?.startsWith('chrome-extension://')) return true;
  if (tab.url?.startsWith('https://chromewebstore.google.com')) return true;
  if (tab.url?.includes('checkpoint.html')) return true;
  if (tab.url?.includes('delay.html')) return true;
  if (tab.url?.includes('pin.html')) return true;
  if (tab.url?.includes('hardblock.html')) return true;
  if (tab.url?.includes('tabbudget.html')) return true;
  if (tab.pinned) return true;
  return false;
}

export function useTabCount(): number {
  const [tabCount, setTabCount] = useState(0);

  useEffect(() => {
    async function fetchTabCount() {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const count = tabs.filter((tab) => !shouldExcludeTab(tab)).length;
      setTabCount(count);
    }

    fetchTabCount();

    const handleCreated = () => fetchTabCount();
    const handleRemoved = () => fetchTabCount();
    const handleUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url || changeInfo.pinned !== undefined) {
        fetchTabCount();
      }
    };

    chrome.tabs.onCreated.addListener(handleCreated);
    chrome.tabs.onRemoved.addListener(handleRemoved);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      chrome.tabs.onCreated.removeListener(handleCreated);
      chrome.tabs.onRemoved.removeListener(handleRemoved);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  return tabCount;
}
