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
import { showSettingsDrawer } from './components/SettingsDrawer.js';

// ── Active state (only one thing at a time) ──────
let activeLoader = null;
let activeContextMenu = null;
let activeContactInfo = null;
let activeChatSearch = null;
let activeProfileDrawer = null;
let activeSettingsDrawer = null;
let activeSearch = null;
let pendingScrollTarget = null;
let mainAreaSavedContent = null;

async function init() {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');
  const loadStart = Date.now();

  while (app.firstChild) app.removeChild(app.firstChild);

  const wrapper = document.createElement('div');
  wrapper.className = 'app-wrapper';

  const headerBar = document.createElement('div');
  headerBar.className = 'app-header-bar';

  const container = document.createElement('div');
  container.className = 'app-container';

  const mainArea = document.createElement('main');
  mainArea.className = 'main-area';
  mainArea.setAttribute('role', 'main');

  const AVATARS = { 'martha-graeff': '/assets/avatar-martha-graeff.jpeg' };
  const SENDER_NAMES = { 'DV': 'Daniel Vocaro' };
  const MEDIA_COUNTS = { images: 3930, videos: 430, documents: 55 };

  const store = getDataStore();
  try {
    await store.init();
    for (const conv of store.getConversations()) {
      if (AVATARS[conv.id]) conv.avatar = AVATARS[conv.id];
    }
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }

  // ── Cleanup helpers ──────────────────────────────

  /** Close all right-side drawers (contact info, chat search). */
  function closeRightDrawers() {
    if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }
    if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
  }

  /** Close the chat (loader, context menu, right drawers). */
  function closeChat() {
    closeRightDrawers();
    if (activeLoader) { activeLoader.destroy(); activeLoader = null; }
    if (activeContextMenu) { activeContextMenu.destroy(); activeContextMenu = null; }
  }

  /** Close the profile drawer and restore sidebar + main area. */
  function closeProfile() {
    if (activeProfileDrawer) {
      const d = activeProfileDrawer;
      activeProfileDrawer = null;
      d.destroy();
    }
    restoreMainArea();
  }

  /** Close the settings drawer and restore sidebar + main area. */
  function closeSettings() {
    if (activeSettingsDrawer) {
      const d = activeSettingsDrawer;
      activeSettingsDrawer = null;
      d.destroy();
    }
    restoreMainArea();
  }

  /** Save main area children and hide them, show a placeholder. */
  function hideMainAreaWithPlaceholder(iconSvg, label) {
    mainAreaSavedContent = Array.from(mainArea.children);
    mainAreaSavedContent.forEach(child => child.style.display = 'none');

    const placeholder = document.createElement('div');
    placeholder.className = 'profile-placeholder';
    placeholder.innerHTML = `${iconSvg}<div class="profile-placeholder-text">${label}</div>`;
    mainArea.appendChild(placeholder);
  }

  /** Restore main area children from saved state. */
  function restoreMainArea() {
    const placeholder = mainArea.querySelector('.profile-placeholder');
    if (placeholder) placeholder.remove();
    if (mainAreaSavedContent) {
      mainAreaSavedContent.forEach(child => child.style.display = '');
      mainAreaSavedContent = null;
    }
  }

  /** Close EVERYTHING — profile, settings, chat, drawers. */
  function closeAll() {
    closeRightDrawers();
    closeChat();
    closeProfile();
    closeSettings();
  }

  // ── Placeholder SVGs ──────────────────────────────

  const SVG_PROFILE = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/></svg>`;

  const SVG_COG = `<svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.66248 21.55C9.98748 21.85 10.375 22 10.825 22H13.175C13.625 22 14.0125 21.85 14.3375 21.55C14.6625 21.25 14.8583 20.8833 14.925 20.45L15.15 18.8C15.35 18.7167 15.55 18.6167 15.75 18.5C15.95 18.3833 16.1416 18.2583 16.325 18.125L17.825 18.775C18.2416 18.9583 18.6583 18.975 19.075 18.825C19.4916 18.675 19.8166 18.4083 20.05 18.025L21.25 15.975C21.4833 15.5917 21.55 15.1833 21.45 14.75C21.35 14.3167 21.125 13.9583 20.775 13.675L19.45 12.675C19.4833 12.5583 19.5 12.4458 19.5 12.3375V11.6625C19.5 11.5542 19.4916 11.4417 19.475 11.325L20.8 10.325C21.15 10.0417 21.375 9.68333 21.475 9.25C21.575 8.81667 21.5083 8.40833 21.275 8.025L20.1 5.975C19.8666 5.59167 19.5416 5.325 19.125 5.175C18.7083 5.025 18.2916 5.04167 17.875 5.225L16.325 5.875C16.1416 5.74167 15.9541 5.61667 15.7625 5.5C15.5708 5.38333 15.3666 5.28333 15.15 5.2L14.925 3.55C14.8583 3.11667 14.6625 2.75 14.3375 2.45C14.0125 2.15 13.625 2 13.175 2H10.825C10.375 2 9.98748 2.15 9.66248 2.45C9.33748 2.75 9.14165 3.11667 9.07498 3.55L8.84998 5.2C8.64998 5.28333 8.44998 5.38333 8.24998 5.5C8.04998 5.61667 7.85831 5.74167 7.67498 5.875L6.12498 5.225C5.70831 5.04167 5.29165 5.025 4.87498 5.175C4.45831 5.325 4.13331 5.59167 3.89998 5.975L2.72498 8.025C2.49165 8.40833 2.42498 8.81667 2.52498 9.25C2.62498 9.68333 2.84998 10.0417 3.19998 10.325L4.52498 11.325C4.50831 11.4417 4.49998 11.5542 4.49998 11.6625V12.3375C4.49998 12.4458 4.50831 12.5583 4.52498 12.675L3.19998 13.675C2.84998 13.9583 2.62498 14.3167 2.52498 14.75C2.42498 15.1833 2.49165 15.5917 2.72498 15.975L3.89998 18.025C4.13331 18.4083 4.45831 18.675 4.87498 18.825C5.29165 18.975 5.70831 18.9583 6.12498 18.775L7.67498 18.125C7.85831 18.2583 8.04581 18.3833 8.23748 18.5C8.42915 18.6167 8.63331 18.7167 8.84998 18.8L9.07498 20.45C9.14165 20.8833 9.33748 21.25 9.66248 21.55ZM12 15C12.8286 15 13.5357 14.7071 14.1214 14.1214C14.7071 13.5357 15 12.8286 15 12C15 11.1714 14.7071 10.4643 14.1214 9.87857C13.5357 9.29286 12.8286 9 12 9C11.1571 9 10.4464 9.29286 9.86786 9.87857C9.28929 10.4643 9 11.1714 9 12C9 12.8286 9.28929 13.5357 9.86786 14.1214C10.4464 14.7071 11.1571 15 12 15Z"/></svg>`;

  // ── Shared search action for sidebar ───────────────

  function fillSidebarSearch(term) {
    const isMobile = window.innerWidth <= 600;

    if (isMobile) {
      // On mobile, open conversation first then trigger mobile search with pre-filled term
      if (!activeLoader) {
        router.navigate('chat', 'martha-graeff');
      }
      setTimeout(() => {
        const chatViewEl = mainArea.querySelector('.chat-view');
        if (chatViewEl && !activeChatSearch) {
          activeChatSearch = showMobileSearchBar(chatViewEl, 'martha-graeff', {
            onNavigate: (messageId, date) => activeLoader?.scrollToMessage(messageId, date),
            onDateSelect: (date) => activeLoader?.scrollToDate(date),
            onClose: () => { activeChatSearch = null; },
          });
          // Pre-fill the search input and trigger search
          const mobileInput = chatViewEl.querySelector('.mobile-search-input');
          if (mobileInput) {
            mobileInput.value = term;
            mobileInput.dispatchEvent(new Event('input'));
          }
        }
      }, 300);
    } else {
      // On desktop, fill sidebar search as before
      setTimeout(() => {
        const searchInput = sidebar.querySelector('.sidebar-search-input');
        if (searchInput) {
          searchInput.value = term;
          searchInput.dispatchEvent(new Event('input'));
          searchInput.focus();
        }
      }, 100);
    }
  }

  // ── Chat search toggle ─────────────────────────────

  function toggleChatSearch(conversationId, dateIndex) {
    // Close contact info — only one right drawer at a time
    if (activeContactInfo) { activeContactInfo.destroy(); activeContactInfo = null; }

    if (activeChatSearch) {
      activeChatSearch.destroy();
      activeChatSearch = null;
      return;
    }

    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      const chatViewEl = mainArea.querySelector('.chat-view');
      if (chatViewEl) {
        activeChatSearch = showMobileSearchBar(chatViewEl, conversationId, {
          onNavigate: (messageId, date) => activeLoader?.scrollToMessage(messageId, date),
          onDateSelect: (date) => activeLoader?.scrollToDate(date),
          onClose: () => { activeChatSearch = null; },
        });
      }
    } else {
      activeChatSearch = showChatSearchDrawer(mainArea, conversationId, {
        dateIndex,
        onResultClick: (messageId, date) => activeLoader?.scrollToMessage(messageId, date),
        onDateSelect: (date) => activeLoader?.scrollToDate(date),
        onClose: () => { activeChatSearch = null; },
      });
    }
  }

  // ── Open conversation ──────────────────────────────

  async function openConversation(id) {
    // Close everything first
    closeAll();

    setActiveConversation(sidebar, id);
    container.classList.add('chat-open');

    const conversation = store.getConversation(id);
    if (!conversation) { showEmptyState(); return; }

    const dateIndex = await store.getConversationIndex(id);

    // Build toggleSearch bound to this conversation
    const toggleSearch = () => toggleChatSearch(id, dateIndex);

    // Martha's action handlers (for profile sections in contact info)
    const currentMarthaActions = {
      onProfileDV: () => {
        closeRightDrawers();
        openProfile();
      },
      onSearch: (term) => {
        closeRightDrawers();
        fillSidebarSearch(term);
      },
    };

    const { loader } = renderChatView(mainArea, {
      conversation,
      dateIndex,
      loadMessages: (date) => store.getMessages(id, date),
      onBack: () => router.navigate('home'),
      onCloseChat: () => router.navigate('home'),
      onAbout: openSettings,
      onSearch: toggleSearch,
      onContactClick: () => {
        // Only one right drawer at a time
        if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
        if (activeContactInfo) {
          activeContactInfo.destroy();
          activeContactInfo = null;
        } else {
          activeContactInfo = showContactInfo(mainArea, conversation, {
            mediaCounts: MEDIA_COUNTS,
            onClose: () => { activeContactInfo = null; },
            onSearch: toggleSearch,
            actions: currentMarthaActions,
          });
        }
      },
    });

    activeLoader = loader;
    await loader.init();

    if (pendingScrollTarget) {
      const { messageId, date } = pendingScrollTarget;
      pendingScrollTarget = null;
      await loader.scrollToMessage(messageId, date);
    }

    const messagesArea = mainArea.querySelector('.chat-messages');
    if (messagesArea) {
      const incomingSender = conversation.participants.find(p => p !== 'DV') || '';
      activeContextMenu = attachContextMenu(messagesArea, {
        senderNames: SENDER_NAMES,
        incomingSender,
        conversationId: id,
      });
    }
  }

  // ── Empty state ────────────────────────────────────

  function showEmptyState() {
    closeAll();
    setActiveConversation(sidebar, null);
    container.classList.remove('chat-open');
    while (mainArea.firstChild) mainArea.removeChild(mainArea.firstChild);
    renderEmptyState(mainArea);
  }

  // ── Profile drawer ─────────────────────────────────

  function openProfile() {
    if (activeProfileDrawer) { closeProfile(); return; }

    // Close settings if open
    closeSettings();
    // Close chat drawers
    closeRightDrawers();

    hideMainAreaWithPlaceholder(SVG_PROFILE, 'Perfil');

    activeProfileDrawer = showProfileDrawer(container, {
      onClose: closeProfile,
      actions: {
        onContactMartha: () => {
          closeProfile();
          router.navigate('chat', 'martha-graeff');
          setTimeout(() => {
            const conv = store.getConversation('martha-graeff');
            if (conv && activeLoader) {
              activeContactInfo = showContactInfo(mainArea, conv, {
                mediaCounts: MEDIA_COUNTS,
                onClose: () => { activeContactInfo = null; },
                onSearch: () => toggleChatSearch('martha-graeff', []),
                actions: {
                  onProfileDV: () => { closeRightDrawers(); openProfile(); },
                  onSearch: (term) => { closeRightDrawers(); fillSidebarSearch(term); },
                },
              });
            }
          }, 500);
        },
        onSearch: (term) => {
          closeProfile();
          if (!activeLoader) router.navigate('chat', 'martha-graeff');
          fillSidebarSearch(term);
        },
      },
    });
  }

  // ── Settings drawer ────────────────────────────────

  function openSettings() {
    if (activeSettingsDrawer) { closeSettings(); return; }

    // Close profile if open
    closeProfile();
    // Close chat drawers
    closeRightDrawers();

    hideMainAreaWithPlaceholder(SVG_COG, 'Sobre');

    activeSettingsDrawer = showSettingsDrawer(container, {
      onClose: closeSettings,
      actions: {
        onSearch: (term) => {
          closeSettings();
          if (!activeLoader) router.navigate('chat', 'martha-graeff');
          fillSidebarSearch(term);
        },
      },
    });
  }

  // ── Wire nav rail ──────────────────────────────────

  const navRail = renderNavRail(container, {
    avatarSrc: '/assets/avatar-dv.jpg',
    onSettings: openSettings,
    onChat: () => {
      closeProfile();
      closeSettings();
    },
  });

  const navAvatar = navRail.querySelector('.nav-rail-avatar');
  if (navAvatar) navAvatar.addEventListener('click', openProfile);

  // ── Wire sidebar ───────────────────────────────────

  const sidebar = renderSidebar(container, {
    conversations: store.getConversations(),
    onProfile: openProfile,
    onAbout: openSettings,
    onSelect: (id) => {
      // Close profile/settings if open before navigating
      closeProfile();
      closeSettings();
      router.navigate('chat', id);
    },
  });

  // Lock message link → open DV profile
  const lockLink = sidebar.querySelector('.sidebar-lock-link');
  if (lockLink) lockLink.addEventListener('click', openProfile);

  // Sidebar search
  const conversations = store.getConversations();
  if (conversations.length > 0) {
    activeSearch = attachSearch(sidebar, conversations[0].id, (messageId, date) => {
      if (activeLoader) {
        activeLoader.scrollToMessage(messageId, date);
      } else {
        pendingScrollTarget = { messageId, date };
        router.navigate('chat', conversations[0].id);
      }
    });
  }

  // ── Router ─────────────────────────────────────────

  const router = new HashRouter();
  router.on('home', () => showEmptyState());
  router.on('chat', async (id, messageId) => {
    if (messageId) {
      // Look up the date for this message ID
      const date = await store.findDateForMessage(id, messageId);
      if (date) {
        pendingScrollTarget = { messageId, date };
      }
    }
    openConversation(id);
  });

  renderEmptyState(mainArea);

  container.appendChild(mainArea);
  app.appendChild(headerBar);
  wrapper.appendChild(container);
  app.appendChild(wrapper);

  const elapsed = Date.now() - loadStart;
  const minLoading = 2500;
  if (elapsed < minLoading) {
    await new Promise(r => setTimeout(r, minLoading - elapsed));
  }

  if (loadingScreen) loadingScreen.remove();
  app.style.display = '';

  router.start();
}

init().catch(err => {
  console.error('MasterWhats init failed:', err);
  const loading = document.getElementById('loading-screen');
  if (loading) loading.remove();
  const app = document.getElementById('app');
  if (app) app.style.display = '';
});
