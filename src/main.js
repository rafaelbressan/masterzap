// MasterZap — WhatsApp-like web viewer
// Entry point — initializes the app layout

import { getDataStore } from './lib/data-store.js';
import { HashRouter } from './lib/router.js';
import { renderSidebar, setActiveConversation } from './components/Sidebar.js';
import { renderEmptyState } from './components/EmptyState.js';
import { renderChatView } from './components/ChatView.js';
import { attachContextMenu } from './components/ContextMenu.js';
import { attachSearch } from './components/SearchPanel.js';
import { showContactInfo } from './components/ContactInfo.js';

/** Currently active scroll loader (cleaned up on conversation switch). */
let activeLoader = null;
/** Currently active context menu (cleaned up on conversation switch). */
let activeContextMenu = null;
/** Currently active search (cleaned up if conversation changes). */
let activeSearch = null;
/** Currently active contact info drawer. */
let activeContactInfo = null;

async function init() {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');
  const loadStart = Date.now();

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

  // Avatar mapping — conversation id → image path
  const AVATARS = {
    'martha-graeff': '/assets/avatar-martha-graeff.jpeg',
  };

  // Sender display names — map short names to full names
  const SENDER_NAMES = {
    'DV': 'Daniel Vocaro',
  };

  // Initialize data store
  const store = getDataStore();
  try {
    await store.init();
    // Inject avatar paths into conversation objects
    for (const conv of store.getConversations()) {
      if (AVATARS[conv.id]) conv.avatar = AVATARS[conv.id];
    }
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }

  /** Open a conversation in the main area. */
  async function openConversation(id) {
    // Clean up previous state
    if (activeLoader) { activeLoader.destroy(); activeLoader = null; }
    if (activeContextMenu) { activeContextMenu.destroy(); activeContextMenu = null; }
    if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }

    setActiveConversation(sidebar, id);
    container.classList.add('chat-open');

    const conversation = store.getConversation(id);
    if (!conversation) {
      showEmptyState();
      return;
    }

    const dateIndex = await store.getConversationIndex(id);

    // Media counts for contact info
    const mediaCounts = { images: 3930, videos: 430, documents: 55 };

    const { loader } = renderChatView(mainArea, {
      conversation,
      dateIndex,
      loadMessages: (date) => store.getMessages(id, date),
      onBack: () => router.navigate('home'),
      onCloseChat: () => router.navigate('home'),
      onContactClick: () => {
        if (activeContactInfo) {
          activeContactInfo.destroy();
          activeContactInfo = null;
        } else {
          activeContactInfo = showContactInfo(mainArea, conversation, {
            mediaCounts,
            onClose: () => { activeContactInfo = null; },
          });
        }
      },
    });

    activeLoader = loader;
    await loader.init();

    // Attach context menu to the messages area
    const messagesArea = mainArea.querySelector('.chat-messages');
    if (messagesArea) {
      const incomingSender = conversation.participants.find(p => p !== 'DV') || '';
      activeContextMenu = attachContextMenu(messagesArea, {
        senderNames: SENDER_NAMES,
        incomingSender,
      });
    }
  }

  /** Show the empty state (no conversation selected). */
  function showEmptyState() {
    if (activeLoader) { activeLoader.destroy(); activeLoader = null; }
    if (activeContextMenu) { activeContextMenu.destroy(); activeContextMenu = null; }
    if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
    setActiveConversation(sidebar, null);
    container.classList.remove('chat-open');
    while (mainArea.firstChild) mainArea.removeChild(mainArea.firstChild);
    renderEmptyState(mainArea);
  }

  // Render sidebar with conversation data
  const sidebar = renderSidebar(container, {
    conversations: store.getConversations(),
    onSelect: (id) => router.navigate('chat', id),
  });

  // Attach search — uses first conversation for now
  const conversations = store.getConversations();
  if (conversations.length > 0) {
    activeSearch = attachSearch(sidebar, conversations[0].id, (messageId, date) => {
      // Navigate to the conversation and scroll to the message date
      router.navigate('chat', conversations[0].id);
    });
  }

  // Set up hash router
  const router = new HashRouter();
  router.on('home', () => showEmptyState());
  router.on('chat', (id) => openConversation(id));

  // Show empty state initially (before router fires)
  renderEmptyState(mainArea);

  container.appendChild(mainArea);
  app.appendChild(headerBar);
  wrapper.appendChild(container);
  app.appendChild(wrapper);

  // Wait for loading screen to finish (min 2.5s from page load)
  const elapsed = Date.now() - loadStart;
  const minLoading = 2500;
  if (elapsed < minLoading) {
    await new Promise(r => setTimeout(r, minLoading - elapsed));
  }

  // Hide loading, show app
  if (loadingScreen) loadingScreen.remove();
  app.style.display = '';

  // Start router — handles current hash
  router.start();
}

init();
