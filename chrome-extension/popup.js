let debuggerAttached = false;
let currentTabId = null;
let websocketUrl = null;

// Check if debugger is already attached
async function checkDebuggerStatus() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return;

  currentTabId = tabs[0].id;

  // Check storage for existing connection
  const stored = await chrome.storage.local.get(['debuggerAttached', 'websocketUrl', 'tabId']);

  if (stored.debuggerAttached && stored.tabId === currentTabId && stored.websocketUrl) {
    debuggerAttached = true;
    websocketUrl = stored.websocketUrl;
    updateUI(true, stored.websocketUrl);
  } else {
    updateUI(false);
  }
}

// Enable browser control (attach debugger)
document.getElementById('enableBtn').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      alert('No active tab found');
      return;
    }

    currentTabId = tabs[0].id;
    const debuggee = { tabId: currentTabId };

    // Attach debugger to this tab
    await chrome.debugger.attach(debuggee, '1.3');

    // Get all debug targets
    const targets = await chrome.debugger.getTargets();
    const target = targets.find(t => t.tabId === currentTabId);

    if (target && target.id) {
      // Construct WebSocket URL for Playwright to connect
      // Chrome's CDP WebSocket endpoint format
      websocketUrl = `ws://127.0.0.1:9222/devtools/page/${target.id}`;

      debuggerAttached = true;

      // Store state
      await chrome.storage.local.set({
        debuggerAttached: true,
        websocketUrl: websocketUrl,
        tabId: currentTabId,
        targetId: target.id
      });

      updateUI(true, websocketUrl);

      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'DEBUGGER_ATTACHED',
        tabId: currentTabId,
        websocketUrl: websocketUrl
      });

    } else {
      throw new Error('Could not get target ID from Chrome');
    }

  } catch (error) {
    console.error('Failed to attach debugger:', error);
    alert(`Failed to enable browser control: ${error.message}`);
  }
});

// Disable browser control (detach debugger)
document.getElementById('disableBtn').addEventListener('click', async () => {
  try {
    if (currentTabId) {
      await chrome.debugger.detach({ tabId: currentTabId });
    }

    debuggerAttached = false;
    websocketUrl = null;

    await chrome.storage.local.clear();
    updateUI(false);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_DETACHED',
      tabId: currentTabId
    });

  } catch (error) {
    console.error('Failed to detach debugger:', error);
  }
});

// Copy WebSocket URL to clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (websocketUrl) {
    await navigator.clipboard.writeText(websocketUrl);

    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }
});

// Update UI based on debugger status
function updateUI(attached, wsUrl = null) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const websocketUrlDiv = document.getElementById('websocketUrl');
  const enableBtn = document.getElementById('enableBtn');
  const copyBtn = document.getElementById('copyBtn');
  const disableBtn = document.getElementById('disableBtn');

  if (attached && wsUrl) {
    statusDot.classList.add('active');
    statusText.textContent = 'Browser Control Active ✓';
    websocketUrlDiv.textContent = wsUrl;
    enableBtn.style.display = 'none';
    copyBtn.style.display = 'block';
    disableBtn.style.display = 'block';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = 'Ready to connect';
    websocketUrlDiv.textContent = 'Click "Enable Browser Control" below';
    enableBtn.style.display = 'block';
    copyBtn.style.display = 'none';
    disableBtn.style.display = 'none';
  }
}

// Listen for debugger detach events
chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId === currentTabId) {
    console.log('Debugger detached, reason:', reason);
    debuggerAttached = false;
    websocketUrl = null;
    chrome.storage.local.clear();
    updateUI(false);
  }
});

// Initial load
checkDebuggerStatus();
