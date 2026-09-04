import { useState, useEffect } from 'react';
import { queryEligibleNormalTabs } from '../../shared/utils/tabs';

export function useTabCount(): number {
  const [tabCount, setTabCount] = useState(0);

  useEffect(() => {
    async function fetchTabCount() {
      const count = (await queryEligibleNormalTabs()).length;
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
