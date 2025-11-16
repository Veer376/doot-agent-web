// background.js - Service worker for Chrome extension

console.log('Orbit Agent Browser Connector - Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Show welcome notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Orbit Agent Connected',
      message: 'Click the extension icon to enable browser control'
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'DEBUGGER_ATTACHED') {
    console.log('Debugger attached to tab:', message.tabId);
    console.log('WebSocket URL:', message.websocketUrl);
    
    // Show success notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Browser Control Enabled',
      message: 'Orbit Agent can now control this browser'
    });
  }
  
  if (message.type === 'DEBUGGER_DETACHED') {
    console.log('Debugger detached from tab:', message.tabId);
    
    // Show notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Browser Control Disabled',
      message: 'Connection to Orbit Agent closed'
    });
  }
  
  sendResponse({ success: true });
});

// Listen for debugger detach events globally
chrome.debugger?.onDetach.addListener((source, reason) => {
  console.log('Debugger detached globally:', source, reason);
  
  // Clean up storage
  chrome.storage.local.get(['tabId'], (result) => {
    if (result.tabId === source.tabId) {
      chrome.storage.local.clear();
    }
  });
});
