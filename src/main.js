// MasterZap — WhatsApp-like web viewer
// Entry point — initializes the app layout

import { renderSidebar, setActiveConversation } from './components/Sidebar.js';
import { renderEmptyState } from './components/EmptyState.js';

async function init() {
  const app = document.getElementById('app');

  // Clear any existing content safely
  while (app.firstChild) app.removeChild(app.firstChild);

  // Build the shell using DOM APIs
  const wrapper = document.createElement('div');
  wrapper.className = 'app-wrapper';

  const headerBar = document.createElement('div');
  headerBar.className = 'app-header-bar';

  const container = document.createElement('div');
  container.className = 'app-container';

  const mainArea = document.createElement('main');
  mainArea.className = 'main-area';
  mainArea.setAttribute('role', 'main');

  // Fetch conversation list
  let conversations = [];
  try {
    const res = await fetch('/data/conversations.json');
    const data = await res.json();
    conversations = data.conversations || [];
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }

  // Render sidebar
  const sidebar = renderSidebar(container, {
    conversations,
    onSelect: (id) => {
      setActiveConversation(sidebar, id);
      // Chat view will be implemented in Batch 4
      console.log('Selected conversation:', id);
    },
  });

  // Render empty state in main area
  renderEmptyState(mainArea);

  container.appendChild(mainArea);
  app.appendChild(headerBar);
  wrapper.appendChild(container);
  app.appendChild(wrapper);
}

init();
