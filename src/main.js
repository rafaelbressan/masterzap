// MasterWhats — WhatsApp-like web viewer
// Entry point — initializes the app layout

import { getDataStore } from './lib/data-store.js';
import { HashRouter } from './lib/router.js';
import { renderSidebar, setActiveConversation } from './components/Sidebar.js';
import { renderEmptyState } from './components/EmptyState.js';
import { renderChatView } from './components/ChatView.js';
import { attachContextMenu } from './components/ContextMenu.js';
import { attachSearch } from './components/SearchPanel.js';
import { showContactInfo } from './components/ContactInfo.js';
import { showChatSearchDrawer } from './components/ChatSearchDrawer.js';
import { showMobileSearchBar } from './components/MobileSearchBar.js';
import { renderNavRail } from './components/NavRail.js';
import { showProfileDrawer } from './components/ProfileDrawer.js';

/** Currently active scroll loader (cleaned up on conversation switch). */
let activeLoader = null;
/** Currently active context menu (cleaned up on conversation switch). */
let activeContextMenu = null;
/** Currently active search (cleaned up if conversation changes). */
let activeSearch = null;
/** Currently active contact info drawer. */
let activeContactInfo = null;
/** Currently active chat search drawer. */
let activeChatSearch = null;
/** Pending scroll target after conversation loads. */
let pendingScrollTarget = null;
/** Currently active profile drawer. */
let activeProfileDrawer = null;
/** Current search toggle function (set per conversation). */
let toggleSearchFn = null;
/** Martha action handlers (set per conversation). */
let marthaActions = {};

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
    if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }

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

    // Shared search toggle function (also stored as module-level ref)
    function toggleSearch() {
      // Close contact info if open
      if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
      if (activeChatSearch) {
        activeChatSearch.destroy();
        activeChatSearch = null;
      } else {
        const isMobile = window.innerWidth <= 600;
        if (isMobile) {
          const chatViewEl = mainArea.querySelector('.chat-view');
          if (chatViewEl) {
            activeChatSearch = showMobileSearchBar(chatViewEl, id, {
              onNavigate: (messageId, date) => {
                activeLoader.scrollToMessage(messageId, date);
              },
              onClose: () => { activeChatSearch = null; },
            });
          }
        } else {
          activeChatSearch = showChatSearchDrawer(mainArea, id, {
            dateIndex,
            onResultClick: (messageId, date) => {
              activeLoader.scrollToMessage(messageId, date);
            },
            onDateSelect: (date) => {
              activeLoader.scrollToDate(date);
            },
            onClose: () => { activeChatSearch = null; },
          });
        }
      }
    }

    // Store refs for profile drawer actions
    toggleSearchFn = toggleSearch;
    marthaActions = {
      onProfileDV: () => {
        // Close contact info, open profile
        if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
        openProfile();
      },
      onSearch: (term) => {
        // Close contact info, fill sidebar search
        if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
        const searchInput = sidebar.querySelector('.sidebar-search-input');
        if (searchInput) {
          searchInput.value = term;
          searchInput.dispatchEvent(new Event('input'));
        }
      },
    };

    const { loader } = renderChatView(mainArea, {
      conversation,
      dateIndex,
      loadMessages: (date) => store.getMessages(id, date),
      onBack: () => router.navigate('home'),
      onCloseChat: () => router.navigate('home'),
      onSearch: toggleSearch,
      onContactClick: () => {
        // Close search if open
        if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
        if (activeContactInfo) {
          activeContactInfo.destroy();
          activeContactInfo = null;
        } else {
          activeContactInfo = showContactInfo(mainArea, conversation, {
            mediaCounts,
            onClose: () => { activeContactInfo = null; },
            onSearch: toggleSearch,
            actions: marthaActions,
          });
        }
      },
    });

    activeLoader = loader;
    await loader.init();

    // Execute pending scroll target (from sidebar search)
    if (pendingScrollTarget) {
      const { messageId, date } = pendingScrollTarget;
      pendingScrollTarget = null;
      await loader.scrollToMessage(messageId, date);
    }

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
    if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
    setActiveConversation(sidebar, null);
    container.classList.remove('chat-open');
    while (mainArea.firstChild) mainArea.removeChild(mainArea.firstChild);
    renderEmptyState(mainArea);
  }

  // Render nav rail (far-left icon bar)
  const navRail = renderNavRail(container, { avatarSrc: '/assets/avatar-dv.webp' });

  // Click avatar on nav rail → open DV profile
  const navAvatar = navRail.querySelector('.nav-rail-avatar');
  let mainAreaSavedContent = null;

  function openProfile() {
    if (activeProfileDrawer) { closeProfile(); return; }

    // Close any active drawers
    if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
    if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }

    // Save main area content and replace with profile placeholder
    mainAreaSavedContent = Array.from(mainArea.children);
    mainAreaSavedContent.forEach(child => child.style.display = 'none');

    const placeholder = document.createElement('div');
    placeholder.className = 'profile-placeholder';
    placeholder.innerHTML = `
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/></svg>
      <div class="profile-placeholder-text">Perfil</div>
    `;
    mainArea.appendChild(placeholder);

    activeProfileDrawer = showProfileDrawer(container, {
      onClose: closeProfile,
      actions: {
        onContactMartha: () => {
          // Close profile, open conversation, then open contact info
          closeProfile();
          router.navigate('chat', 'martha-graeff');
          // Wait for conversation to load, then open contact info
          setTimeout(() => {
            const conv = store.getConversation('martha-graeff');
            if (conv && activeLoader) {
              if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
              activeContactInfo = showContactInfo(mainArea, conv, {
                mediaCounts: { images: 3930, videos: 430, documents: 55 },
                onClose: () => { activeContactInfo = null; },
                onSearch: toggleSearchFn,
                actions: marthaActions,
              });
            }
          }, 500);
        },
        onSearch: (term) => {
          // Close profile, fill sidebar search
          closeProfile();
          // If conversation not open, navigate first
          if (!activeLoader) {
            router.navigate('chat', 'martha-graeff');
          }
          // Fill search after a tick (sidebar is restored by closeProfile)
          setTimeout(() => {
            const searchInput = sidebar.querySelector('.sidebar-search-input');
            if (searchInput) {
              searchInput.value = term;
              searchInput.dispatchEvent(new Event('input'));
              searchInput.focus();
            }
          }, 100);
        },
      },
    });
  }

  function closeProfile() {
    if (activeProfileDrawer) {
      const drawer = activeProfileDrawer;
      activeProfileDrawer = null; // Nullify first to prevent recursion
      drawer.destroy();
    }
    // Remove placeholder and restore main area content
    const placeholder = mainArea.querySelector('.profile-placeholder');
    if (placeholder) placeholder.remove();
    if (mainAreaSavedContent) {
      mainAreaSavedContent.forEach(child => child.style.display = '');
      mainAreaSavedContent = null;
    }
  }

  if (navAvatar) {
    navAvatar.addEventListener('click', openProfile);
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
      if (activeLoader) {
        // Conversation already open — scroll directly
        activeLoader.scrollToMessage(messageId, date);
      } else {
        // Set pending scroll target, then navigate
        pendingScrollTarget = { messageId, date };
        router.navigate('chat', conversations[0].id);
      }
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

init().catch(err => {
  console.error('MasterWhats init failed:', err);
  // Ensure app is revealed even on error
  const loading = document.getElementById('loading-screen');
  if (loading) loading.remove();
  const app = document.getElementById('app');
  if (app) app.style.display = '';
});
