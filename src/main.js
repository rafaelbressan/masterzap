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
import { loadReadConversations, markConversationRead } from './lib/read-state.js';
import { showToast } from './components/Toast.js';
import {
  shareChatScreenshot, prepareScreenshot, clearPreparedScreenshot,
  shareImageFile, canShareFiles,
} from './lib/screenshot.js';
import { showImagePreview } from './components/ImagePreview.js';
import { renderCallsPanel } from './components/CallsPanel.js';
import { showApiDrawer } from './components/ApiDrawer.js';
import { showLegalDrawer } from './components/LegalDrawer.js';
import { exportUrl, EXPORT_ALL_URL, downloadFile } from './lib/export.js';
import { copyText } from './lib/utils.js';

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
let currentConversationId = null;
let activeImagePreview = null;

async function init() {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');
  const loadStart = Date.now();

  // A pre-rendered /chat/<id> page carries the conversation as plain HTML for
  // crawlers; the app is about to draw the real thing.
  document.getElementById('prerender')?.remove();

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

  // Contacts with a photograph. Everyone else falls back to the generated
  // coloured avatar in lib/avatar.js, keyed by conversation id.
  const AVATARS = {
    'martha-graeff': '/assets/avatar-martha-graeff.jpeg',
    'alexandre-de-moraes': '/assets/avatar-alexandre-de-moraes.jpg',
    'fabio-faria': '/assets/avatar-fabio-faria.jpg',
    'vivi-moraes': '/assets/avatar-vivi-moraes.jpg',
    'ciro-soares': '/assets/avatar-ciro-soares.jpg',
    'geraldo-brazil-journal': '/assets/avatar-geraldo-brazil-journal.jpg',
    'fabiano-zettel': '/assets/avatar-fabiano-zettel.jpg',
    'marcio-conjur': '/assets/avatar-marcio-conjur.jpg',
    'diretor-paulo-sergio-bacen': '/assets/avatar-diretor-paulo-sergio-bacen.jpg',
    'leo-palhares': '/assets/avatar-leo-palhares.jpg',
    'marcos-prime': '/assets/avatar-marcos-prime.jpg',
    'thatiane-prime': '/assets/avatar-thatiane-prime.jpg',
    'leo-serrano': '/assets/avatar-leo-serrano.jpg',
    'stella-vorcaro': '/assets/avatar-stella-vorcaro.jpg',
    'luiz-renno': '/assets/avatar-luiz-renno.jpg',
    'ana-matos-mkt': '/assets/avatar-ana-matos-mkt.jpg',
    // The chat Vorcaro kept with himself — his own photo, as WhatsApp shows it.
    'dv-self': '/assets/avatar-dv.jpg',
  };
  const SENDER_NAMES = { 'DV': 'Daniel Vocaro' };
  // Per-conversation media tallies come from conversations.json (built by
  // scripts/split_data.py); this is only the fallback for older data.
  const MEDIA_COUNTS = { images: 0, videos: 0, documents: 0 };

  const readConversations = loadReadConversations();

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
    clearPreparedScreenshot();
    if (activeImagePreview) { activeImagePreview.destroy(); activeImagePreview = null; }
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

  let activeApiDrawer = null;
  let activeLegalDrawer = null;

  /** Close the legal notice and restore sidebar + main area. */
  function closeLegal() {
    const wasOpen = !!activeLegalDrawer;
    if (activeLegalDrawer) {
      const d = activeLegalDrawer;
      activeLegalDrawer = null;
      d.destroy();
    }
    restoreMainArea();
    if (wasOpen && router.getCurrentRoute().route === 'legal') router.replace('home');
  }

  /** Close the API/MCP page and restore sidebar + main area. */
  function closeApi() {
    const wasOpen = !!activeApiDrawer;
    if (activeApiDrawer) {
      const d = activeApiDrawer;
      activeApiDrawer = null;
      d.destroy();
    }
    restoreMainArea();
    // The page lives at #/api; leaving it by any door leaves the address too,
    // or the next "open" would navigate to where we already are and do nothing.
    // Silently: a hashchange here would run the home handler, which closes
    // every drawer — including the one that may be opening in our place.
    if (wasOpen && router.getCurrentRoute().route === 'api') router.replace('home');
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

    // The same card the empty state uses: icon and title, no footer.
    renderEmptyState(mainArea, { title: label, text: '', iconSvg, footer: null, className: 'profile-placeholder' });
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
    closeApi();
    closeLegal();
  }

  // ── Placeholder SVGs ──────────────────────────────

  const SVG_PROFILE = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/></svg>`;

  const SVG_COG = `<svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.66248 21.55C9.98748 21.85 10.375 22 10.825 22H13.175C13.625 22 14.0125 21.85 14.3375 21.55C14.6625 21.25 14.8583 20.8833 14.925 20.45L15.15 18.8C15.35 18.7167 15.55 18.6167 15.75 18.5C15.95 18.3833 16.1416 18.2583 16.325 18.125L17.825 18.775C18.2416 18.9583 18.6583 18.975 19.075 18.825C19.4916 18.675 19.8166 18.4083 20.05 18.025L21.25 15.975C21.4833 15.5917 21.55 15.1833 21.45 14.75C21.35 14.3167 21.125 13.9583 20.775 13.675L19.45 12.675C19.4833 12.5583 19.5 12.4458 19.5 12.3375V11.6625C19.5 11.5542 19.4916 11.4417 19.475 11.325L20.8 10.325C21.15 10.0417 21.375 9.68333 21.475 9.25C21.575 8.81667 21.5083 8.40833 21.275 8.025L20.1 5.975C19.8666 5.59167 19.5416 5.325 19.125 5.175C18.7083 5.025 18.2916 5.04167 17.875 5.225L16.325 5.875C16.1416 5.74167 15.9541 5.61667 15.7625 5.5C15.5708 5.38333 15.3666 5.28333 15.15 5.2L14.925 3.55C14.8583 3.11667 14.6625 2.75 14.3375 2.45C14.0125 2.15 13.625 2 13.175 2H10.825C10.375 2 9.98748 2.15 9.66248 2.45C9.33748 2.75 9.14165 3.11667 9.07498 3.55L8.84998 5.2C8.64998 5.28333 8.44998 5.38333 8.24998 5.5C8.04998 5.61667 7.85831 5.74167 7.67498 5.875L6.12498 5.225C5.70831 5.04167 5.29165 5.025 4.87498 5.175C4.45831 5.325 4.13331 5.59167 3.89998 5.975L2.72498 8.025C2.49165 8.40833 2.42498 8.81667 2.52498 9.25C2.62498 9.68333 2.84998 10.0417 3.19998 10.325L4.52498 11.325C4.50831 11.4417 4.49998 11.5542 4.49998 11.6625V12.3375C4.49998 12.4458 4.50831 12.5583 4.52498 12.675L3.19998 13.675C2.84998 13.9583 2.62498 14.3167 2.52498 14.75C2.42498 15.1833 2.49165 15.5917 2.72498 15.975L3.89998 18.025C4.13331 18.4083 4.45831 18.675 4.87498 18.825C5.29165 18.975 5.70831 18.9583 6.12498 18.775L7.67498 18.125C7.85831 18.2583 8.04581 18.3833 8.23748 18.5C8.42915 18.6167 8.63331 18.7167 8.84998 18.8L9.07498 20.45C9.14165 20.8833 9.33748 21.25 9.66248 21.55ZM12 15C12.8286 15 13.5357 14.7071 14.1214 14.1214C14.7071 13.5357 15 12.8286 15 12C15 11.1714 14.7071 10.4643 14.1214 9.87857C13.5357 9.29286 12.8286 9 12 9C11.1571 9 10.4464 9.29286 9.86786 9.87857C9.28929 10.4643 9 11.1714 9 12C9 12.8286 9.28929 13.5357 9.86786 14.1214C10.4464 14.7071 11.1571 15 12 15Z"/></svg>`;

  // ── Shared search action for sidebar ───────────────

  function fillSidebarSearch(term, convId) {
    const isMobile = window.innerWidth <= 600;
    const target = convId || currentConversationId || 'martha-graeff';

    if (isMobile) {
      // On mobile, open conversation first then trigger mobile search with pre-filled term
      if (!activeLoader || target !== currentConversationId) {
        router.navigate('chat', target);
      }
      setTimeout(() => {
        const chatViewEl = mainArea.querySelector('.chat-view');
        if (chatViewEl && !activeChatSearch) {
          activeChatSearch = showMobileSearchBar(chatViewEl, target, {
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
    // Opening a conversation marks it read, which updates its badge and the
    // "Não lidas" tally.
    if (markConversationRead(readConversations, id)) sidebar.refreshReadState?.();
    container.classList.add('chat-open');

    const conversation = store.getConversation(id);
    if (!conversation) { showEmptyState(); return; }
    currentConversationId = id;

    const dateIndex = await store.getConversationIndex(id);

    // Build toggleSearch bound to this conversation
    const toggleSearch = () => toggleChatSearch(id, dateIndex);

    /**
     * Capture what is on screen and hand it to the platform.
     *
     * The main area is exactly the right frame for this: on mobile it fills the
     * screen, and on desktop it is the chat without the sidebar.
     */
    const contactName = conversation.participants.find(p => p !== 'DV')
      || conversation.participants[0];

    async function shareScreenshot() {
      const result = await shareChatScreenshot(mainArea, contactName);
      console.info('[screenshot]', result.outcome, result.reason || '', result.diag);

      // 'shared' and 'cancelled' say themselves — the share sheet was the
      // confirmation, and dismissing it was a decision.
      if (result.outcome === 'copied') showToast(mainArea, 'Imagem copiada');
      if (result.outcome === 'retry') showToast(mainArea, 'Toque novamente para compartilhar');

      // The platform will neither share the file nor take it on the clipboard.
      // Put the image on screen: long-pressing it reaches the browser's own
      // share menu, which does know how to get to WhatsApp.
      if (result.outcome === 'preview') {
        activeImagePreview = showImagePreview(mainArea, result.blob, {
          filename: result.filename,
          // Offered only where the platform genuinely shares files. Firefox
          // exposes navigator.share but will not take an image, and a button
          // that fails is worse than no button.
          onShare: canShareFiles()
            ? () => shareImageFile(result.blob, result.filename)
            : null,
          onClose: () => { activeImagePreview = null; },
        });
      }

      if (result.outcome === 'failed') {
        showToast(mainArea, 'Não foi possível gerar a imagem');
      }
    }

    // Action handlers for the investigation sections in the contact drawer
    const contactProfileActions = {
      onProfileDV: () => {
        closeRightDrawers();
        openProfile();
      },
      onSearch: (term, convId) => {
        closeRightDrawers();
        fillSidebarSearch(term, convId);
      },
      onContact: (convId) => {
        closeRightDrawers();
        drawerActions(() => {}).onContact(convId);
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
      onScreenshot: shareScreenshot,
      onExport: (format) => downloadFile(exportUrl(conversation.id, format)),
      // Contact cards, voice notes and the like need to know who is who.
      media: {
        conversations: store.getConversations(),
        avatarFor: (convId) => AVATARS[convId] || null,
        selfAvatar: AVATARS['dv-self'],
        contactAvatar: AVATARS[conversation.id] || null,
        contactName,
        onOpenChat: (convId) => router.navigate('chat', convId),
        onCopy: (text, label) => copyText(text).then(ok => showToast(mainArea, ok ? label : 'Não foi possível copiar')),
      },
      onMenuOpen: () => prepareScreenshot(mainArea, contactName),
      onContactClick: () => {
        // Only one right drawer at a time
        if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
        if (activeContactInfo) {
          activeContactInfo.destroy();
          activeContactInfo = null;
        } else {
          activeContactInfo = showContactInfo(mainArea, conversation, {
            mediaCounts: conversation.media_counts || MEDIA_COUNTS,
            onClose: () => { activeContactInfo = null; },
            onSearch: toggleSearch,
            actions: contactProfileActions,
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

    // One drawer at a time
    closeSettings();
    closeApi();
    closeLegal();
    // Close chat drawers
    closeRightDrawers();

    hideMainAreaWithPlaceholder(SVG_PROFILE, 'Perfil');

    activeProfileDrawer = showProfileDrawer(container, {
      onClose: closeProfile,
      actions: drawerActions(closeProfile),
    });
  }

  /**
   * Action handlers shared by the profile and settings drawers.
   * @param {function} closeDrawer - closes whichever drawer is asking
   */
  function drawerActions(closeDrawer) {
    return {
      // Open a conversation and slide its contact drawer open on top.
      onContact: (convId) => {
        closeDrawer();
        router.navigate('chat', convId);
        setTimeout(() => {
          const conv = store.getConversation(convId);
          if (conv && activeLoader) {
            activeContactInfo = showContactInfo(mainArea, conv, {
              mediaCounts: conv.media_counts || MEDIA_COUNTS,
              onClose: () => { activeContactInfo = null; },
              onSearch: () => toggleChatSearch(convId, []),
              actions: {
                onProfileDV: () => { closeRightDrawers(); openProfile(); },
                onSearch: (term, id) => { closeRightDrawers(); fillSidebarSearch(term, id); },
                onContact: (id) => { closeRightDrawers(); drawerActions(() => {}).onContact(id); },
              },
            });
          }
        }, 500);
      },
      onSearch: (term, convId) => {
        closeDrawer();
        const target = convId || currentConversationId || 'martha-graeff';
        if (!activeLoader || (convId && convId !== currentConversationId)) {
          router.navigate('chat', target);
        }
        fillSidebarSearch(term, target);
      },
    };
  }

  // ── Settings drawer ────────────────────────────────

  function openSettings() {
    if (activeSettingsDrawer) { closeSettings(); return; }

    // One drawer at a time
    closeProfile();
    closeApi();
    closeLegal();
    // Close chat drawers
    closeRightDrawers();

    hideMainAreaWithPlaceholder(SVG_COG, 'Sobre');

    activeSettingsDrawer = showSettingsDrawer(container, {
      onClose: closeSettings,
      onApi: () => (router.getCurrentRoute().route === 'api' ? openApi() : router.navigate('api')),
    onLegal: () => (router.getCurrentRoute().route === 'legal' ? openLegal() : router.navigate('legal')),
      actions: drawerActions(closeSettings),
    });
  }

  const SVG_CODE = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;

  /** The API/MCP page, in the settings drawer's place. Lives at #/api. */
  const SVG_LEGAL = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>`;

  /** The legal notice, in the settings drawer's place. Lives at #/legal. */
  function openLegal() {
    if (activeLegalDrawer) return;
    closeProfile();
    closeSettings();
    closeApi();
    closeRightDrawers();
    hideMainAreaWithPlaceholder(SVG_LEGAL, 'Aviso legal');
    activeLegalDrawer = showLegalDrawer(container, { onClose: closeLegal });
  }

  function openApi(section) {
    if (activeApiDrawer) {
      const target = section && document.getElementById(`api-${section}`);
      if (target) target.scrollIntoView({ block: 'start' });
      return;
    }
    closeProfile();
    closeSettings();
    closeLegal();
    closeRightDrawers();
    hideMainAreaWithPlaceholder(SVG_CODE, 'API/MCP');
    activeApiDrawer = showApiDrawer(container, {
      section,
      onClose: closeApi,
      // The drawer covers the main area on a phone; the toast goes where the eyes are.
      onCopy: (ok) => showToast(activeApiDrawer?.element || mainArea, ok ? 'Copiado' : 'Não foi possível copiar'),
    });
  }

  // ── Wire nav rail ──────────────────────────────────

  const navRail = renderNavRail(container, {
    onCalls: () => router.navigate('calls'),
    avatarSrc: '/assets/avatar-dv.jpg',
    onSettings: openSettings,
    onChat: () => {
      // From the calls screen, this is the way back to the list.
      if (router.getCurrentRoute().route === 'calls') { router.navigate('home'); return; }
      closeProfile();
      closeSettings();
    },
  });

  const navAvatar = navRail.querySelector('.nav-rail-avatar');
  if (navAvatar) navAvatar.addEventListener('click', openProfile);

  // ── Wire sidebar ───────────────────────────────────

  const sidebar = renderSidebar(container, {
    conversations: store.getConversations(),
    readConversations,
    onProfile: openProfile,
    onAbout: openSettings,
    onExportAll: () => downloadFile(EXPORT_ALL_URL),
    onCalls: () => router.navigate('calls'),
    onChats: () => router.navigate('home'),
    onApi: () => (router.getCurrentRoute().route === 'api' ? openApi() : router.navigate('api')),
    onLegal: () => (router.getCurrentRoute().route === 'legal' ? openLegal() : router.navigate('legal')),
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
  router.on('home', () => { sidebar.showChats?.(); navRail.setActive?.('chats'); showEmptyState(); });
  router.on('legal', () => {
    if (activeLegalDrawer) return;
    sidebar.showChats?.(); navRail.setActive?.('chats'); showEmptyState(); openLegal();
  });
  router.on('api', (section) => {
    if (activeApiDrawer) { openApi(section); return; }
    sidebar.showChats?.(); navRail.setActive?.('chats'); showEmptyState(); openApi(section);
  });

  // The calls screen takes the list's place; the log is one file, fetched
  // the first time it is asked for.
  let callsPromise = null;
  const SVG_CALLS = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  router.on('calls', async () => {
    showEmptyState();
    while (mainArea.firstChild) mainArea.removeChild(mainArea.firstChild);
    renderEmptyState(mainArea, { title: 'Chamadas', text: 'As chamadas registradas no material, mais recentes primeiro. Toque numa chamada para abrir a conversa no ponto em que ela aconteceu.', iconSvg: SVG_CALLS });
    callsPromise ??= fetch('/data/calls.json').then(r => r.json()).then(d => d.calls);
    let calls = [];
    try { calls = await callsPromise; } catch { callsPromise = null; }
    const panel = renderCallsPanel({
      calls,
      conversations: store.getConversations(),
      avatarFor: (convId) => AVATARS[convId] || null,
      onOpen: (convId, messageId) => router.navigate('chat', convId, messageId),
      onMenu: () => sidebar.toggleMenu?.(),
    });
    sidebar.showCalls?.(panel);
    navRail.setActive?.('calls');
  });
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
