// MasterWhats — WhatsApp-like web viewer
// Entry point — initializes the app layout

import { getDataStore } from './lib/data-store.js';
import { HashRouter } from './lib/router.js';
import { renderSidebar, setActiveConversation, conversationName } from './components/Sidebar.js';
import { renderEmptyState } from './components/EmptyState.js';
import { renderChatView } from './components/ChatView.js';
import { mountVoiceNoteBar } from './components/VoiceNoteBar.js';
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
  shareChatScreenshot, preloadScreenshot, clearPreparedScreenshot,
  shareImageFile, canShareFiles,
} from './lib/screenshot.js';
import { showImagePreview } from './components/ImagePreview.js';
import { renderCallsPanel } from './components/CallsPanel.js';
import { exportUrl, EXPORT_ALL_URL, downloadFile } from './lib/export.js';
import { copyText } from './lib/utils.js';
import { setSources } from './lib/provenance.js';
import { dataUrl } from './lib/data-url.js';
import { savePosition, getPosition } from './lib/reading-position.js';
import { closeOpenMenu } from './lib/menus.js';
import { renderImportantPanel, setBubbleStar } from './components/ImportantPanel.js';
import { isImportant } from './lib/important-messages.js';
import { initTheme } from './lib/theme.js';
import { DEFAULT_OWNER, OWNER_NAMES, ownerOf, ownerName, contactOf, otherParticipantOf, isOutgoing } from './lib/participants.js';
import { showThemeDialog } from './components/ThemeDialog.js';

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
// The bar on top of the list while a voice note plays outside its chat.
let voiceNoteBar = null;
let activeImagePreview = null;

async function init() {
  // The <head> script already put the theme on; from here it follows the
  // device and other tabs.
  initTheme();
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
    'luiz-renno': '/assets/avatar-luiz-renno.jpg',
    'ana-matos-mkt': '/assets/avatar-ana-matos-mkt.jpg',
    // The chat Vorcaro kept with himself — his own photo, as WhatsApp shows it.
    'dv-self': '/assets/avatar-dv.jpg',
  };
  // Per-conversation media tallies come from conversations.json (built by
  // scripts/split_data.py); this is only the fallback for older data.
  const MEDIA_COUNTS = { images: 0, videos: 0, documents: 0 };

  const readConversations = loadReadConversations();

  const store = getDataStore();
  try {
    await store.init();
    setSources(store.getSources());
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

  /** Remember where the reader is in the open chat, while it is still on screen. */
  function rememberPosition() {
    const position = activeLoader?.currentPosition();
    // undefined: still loading, or hidden behind a drawer — nothing to say.
    if (position !== undefined && currentConversationId) savePosition(currentConversationId, position);
  }
  // A reload or a closed tab never closes the chat; save on the way out too.
  window.addEventListener('pagehide', () => rememberPosition());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') rememberPosition(); });

  /** Close the chat (loader, context menu, right drawers). */
  function closeChat() {
    rememberPosition();
    // The voice note goes on (as WhatsApp); outside its chat, the bar shows it.
    voiceNoteBar?.setOpenConversation(null);
    clearPreparedScreenshot();
    if (activeImagePreview) { activeImagePreview.destroy(); activeImagePreview = null; }
    // The search first: it closes its own calendar along with its history.
    closeRightDrawers();
    // A menu (the message's, the background's) must not outlive its chat.
    closeOpenMenu();
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
    // Hidden, the chat measures 0 everywhere; note the place while it shows.
    rememberPosition();
    closeOpenMenu();
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

  function fillSidebarSearch(term, convId) {
    // The search lives in the list: a screen in its place steps aside.
    sidebar.showChats?.();
    const isMobile = window.innerWidth <= 600;
    const target = convId || currentConversationId || 'martha-graeff';

    if (isMobile) {
      // On mobile, open conversation first then trigger mobile search with pre-filled term
      if (!activeLoader || target !== currentConversationId) {
        router.navigate('chat', target);
      }
      setTimeout(async () => {
        const chatViewEl = mainArea.querySelector('.chat-view');
        if (chatViewEl && !activeChatSearch) {
          // The calendar needs the conversation's days (cached by the open);
          // without them the search still opens, with an empty calendar.
          const dateIndex = await store.getConversationIndex(target).catch(() => []);
          // The open may still have been in flight: take the chat on screen now,
          // and only if it is the one searched.
          const view = mainArea.querySelector(`.chat-view[data-conversation-id="${CSS.escape(target)}"]`);
          if (activeChatSearch || !view) return;
          activeChatSearch = showMobileSearchBar(view, target, {
            dateIndex,
            onNavigate: (messageId, date) => activeLoader?.scrollToMessage(messageId, date),
            onDateSelect: (date) => activeLoader?.scrollToDate(date),
            onClose: () => { activeChatSearch = null; },
          });
          // Pre-fill the search input and trigger search
          const mobileInput = view.querySelector('.mobile-search-input');
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
          dateIndex,
          onNavigate: (messageId, date) => activeLoader?.scrollToMessage(messageId, date),
          onDateSelect: (date) => activeLoader?.scrollToDate(date),
          onClose: () => { activeChatSearch = null; },
        });
      }
    } else {
      activeChatSearch = showChatSearchDrawer(mainArea, conversationId, {
        dateIndex,
        conversation: store.getConversation(conversationId),
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
    voiceNoteBar?.setOpenConversation(id);

    const dateIndex = await store.getConversationIndex(id);
    // Another conversation was opened while this one's index was on its way.
    if (currentConversationId !== id) return;

    // Build toggleSearch bound to this conversation
    const toggleSearch = () => toggleChatSearch(id, dateIndex);

    /**
     * Capture what is on screen and hand it to the platform.
     *
     * The main area is exactly the right frame for this: on mobile it fills the
     * screen, and on desktop it is the chat without the sidebar.
     */
    const contactName = contactOf(conversation);

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
      onImportant: (convId) => {
        closeRightDrawers();
        openImportant(convId);
      },
      onContact: (convId) => {
        closeRightDrawers();
        drawerActions(() => {}).onContact(convId);
      },
    };

    function openContactInfo(at = null) {
      activeContactInfo = showContactInfo(mainArea, conversation, {
        at,
        mediaCounts: conversation.media_counts || MEDIA_COUNTS,
        onClose: () => { activeContactInfo = null; },
        onSearch: toggleSearch,
        actions: contactProfileActions,
      });
    }

    const { loader } = renderChatView(mainArea, {
      conversation,
      dateIndex,
      loadMessages: (date) => store.getMessages(id, date),
      // Opened from the calls or the important messages: back to them.
      onBack: () => (chatFromPanel ? history.back() : router.navigate('home')),
      onCloseChat: () => router.navigate('home'),
      onAbout: openSettings,
      onSearch: toggleSearch,
      onScreenshot: shareScreenshot,
      onExport: (format) => downloadFile(exportUrl(conversation.id, format)),
      // Contact cards, voice notes and the like need to know who is who.
      media: {
        conversations: store.getConversations(),
        avatarFor: (convId) => AVATARS[convId] || null,
        // The owner's photo when there is one (Vorcaro's, for his phones).
      selfAvatar: ownerOf(conversation) === DEFAULT_OWNER ? AVATARS['dv-self'] : null,
      selfName: ownerName(conversation),
        contactAvatar: AVATARS[conversation.id] || null,
        contactName,
        onOpenChat: (convId) => router.navigate('chat', convId),
        onCopy: (text, label) => copyText(text).then(ok => showToast(mainArea, ok ? label : 'Não foi possível copiar')),
      },
      // Only the library: drawing the chat here froze the phone for seconds,
      // and the "Pesquisar" tapped next waited behind it. The tap draws.
      onMenuOpen: preloadScreenshot,
      onContactClick: () => {
        // Only one right drawer at a time
        if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
        if (activeContactInfo) {
          activeContactInfo.destroy();
          activeContactInfo = null;
        } else {
          openContactInfo();
        }
      },
      // The seal notice: open the drawer (never close it) at the "Fonte" row.
      onSourceClick: () => {
        if (activeChatSearch) { activeChatSearch.destroy(); activeChatSearch = null; }
        // A new drawer scrolls there in its first frame; an open one, now.
        if (!activeContactInfo) openContactInfo('.contact-info-source');
        else activeContactInfo.element.querySelector('.contact-info-source')?.scrollIntoView({ block: 'center' });
      },
    });

    activeLoader = loader;

    // The message menu works from the first bubble on screen, not only once
    // the first days (or the restored place) have finished loading.
    const messagesArea = mainArea.querySelector('.chat-messages');
    if (messagesArea) {
      activeContextMenu = attachContextMenu(messagesArea, {
        senderNames: OWNER_NAMES,
        // A sender id, as the messages carry it (not the display contact).
        incomingSender: otherParticipantOf(conversation),
        outgoingSender: ownerOf(conversation),
        conversationId: id,
      });
    }
    // A link to a message goes to that message; otherwise, back where the
    // reader stopped in this conversation earlier in the session.
    // A target left for another conversation (the reader moved on) is dropped.
    const target = pendingScrollTarget?.conversationId === id ? pendingScrollTarget : null;
    pendingScrollTarget = null;
    await loader.init({ position: target ? null : getPosition(id) });

    if (target) {
      await loader.scrollToMessage(target.messageId, target.date);
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

  // ── Mensagens importantes ──────────────────────────

  // Set when a chat is opened from a sidebar screen (calls, important
  // messages), which stays beside it; the chat route takes it at once.
  let keepPanel = false;
  // Whether the chat on screen was opened from such a screen: its back arrow
  // then returns there (a phone), as WhatsApp does.
  let chatFromPanel = false;
  // Routes are numbered: a chat still looking up its message's date when the
  // reader has already gone elsewhere gives way.
  let routeSeq = 0;

  /** Open a message from the calls or the important messages. */
  async function openFromPanel(id, messageId) {
    // Already there (the URL would not change): just go to the message.
    if (location.hash === `#/chat/${id}/msg/${messageId}` && id === currentConversationId && activeLoader) {
      const date = await store.findDateForMessage(id, messageId).catch(() => null);
      if (date) activeLoader.scrollToMessage(messageId, date);
      return;
    }
    keepPanel = true;
    router.navigate('chat', id, messageId);
  }

  /**
   * Open the important messages, all or one conversation's. The history entry
   * it adds is tagged as opened from inside the app, so the list's back arrow
   * may step back to where the reader was; reached by a link, it may not
   * (that step would leave the site).
   */
  function openImportant(convId = null) {
    const hash = convId ? `#/importantes/${convId}` : '#/importantes';
    if (location.hash !== hash) history.pushState({ importantFromApp: true }, '', hash);
    else history.replaceState({ ...history.state, importantFromApp: true }, '');
    showImportant(convId);
  }

  /**
   * "Mensagens importantes" in the list's place. On a desktop the chat on
   * screen stays beside it; the back arrow closes the list and leaves that
   * chat as it is, as WhatsApp does.
   */
  function showImportant(convId) {
    routeSeq++; // a chat still opening gives way
    closeProfile();
    closeSettings();
    // On a phone the open chat covers the list: close it, as the calls do.
    if (window.matchMedia('(max-width: 600px)').matches) showEmptyState();
    // One lookup per mark: the conversations by id, once.
    const conversationsById = new Map(store.getConversations().map(c => [c.id, c]));
    const panel = renderImportantPanel({
      conversationId: convId,
      nameOf: (id) => {
        const conv = store.getConversation(id);
        return conv ? conversationName(conv) : id;
      },
      isOutgoing: (mark) => isOutgoing(mark, conversationsById.get(mark.conversationId)),
      onOpen: (id, messageId) => openFromPanel(id, messageId),
      onBack: () => {
        sidebar.showChats?.();
        // A chat beside the list (desktop): it stays as it is, and the URL
        // follows it. Otherwise (a phone, where the list closed the chat):
        // back to where the list was opened from.
        if (currentConversationId && activeLoader) router.navigate('chat', currentConversationId);
        else if (history.state?.importantFromApp) history.back();
        else router.navigate('home');
        // The keyboard back where the list was opened from: the list's menu.
        sidebar.querySelector('.sidebar-menu-btn')?.focus({ preventScroll: true });
      },
    });
    sidebar.showPanel?.(panel);
    navRail.setActive?.('chats');
    panel.focusStart();
  }

  // One mark changed (menu, list, anywhere): the star on its bubble, the list
  // on screen and the count in the contact's info follow.
  window.addEventListener('importantchange', ({ detail: { conversationId, messageId, marked, all } }) => {
    if (all) {
      // Changed in another tab: every star on screen follows.
      const view = mainArea.querySelector('.chat-view');
      for (const row of view?.querySelectorAll('.chat-msg-row[data-id]') || []) {
        const meta = row.querySelector('.chat-msg-meta');
        if (meta) setBubbleStar(meta, isImportant(view.dataset.conversationId, row.dataset.id));
      }
    } else {
      const row = mainArea.querySelector(`.chat-view[data-conversation-id="${CSS.escape(conversationId)}"] .chat-msg-row[data-id="${CSS.escape(String(messageId))}"]`);
      const meta = row?.querySelector('.chat-msg-meta');
      if (meta) setBubbleStar(meta, marked);
    }
    sidebar.querySelector('.important-panel')?.refresh?.();
    activeContactInfo?.refreshImportant?.();
  });

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
                onImportant: (id) => { closeRightDrawers(); openImportant(id); },
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

    // Close profile if open
    closeProfile();
    // Close chat drawers
    closeRightDrawers();

    hideMainAreaWithPlaceholder(SVG_COG, 'Sobre');

    activeSettingsDrawer = showSettingsDrawer(container, {
      onClose: closeSettings,
      actions: drawerActions(closeSettings),
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
      // The important messages (or the calls beside a chat) give the list back.
      sidebar.showChats?.();
    },
  });

  const navAvatar = navRail.querySelector('.nav-rail-avatar');
  if (navAvatar) navAvatar.addEventListener('click', openProfile);

  // ── Wire sidebar ───────────────────────────────────

  const sidebar = renderSidebar(container, {
    conversations: store.getConversations(),
    readConversations,
    onImportant: () => openImportant(),
    // A browser without <dialog> (Safari before 15.4) shows the item off.
    onTheme: typeof HTMLDialogElement === 'function'
      ? () => showThemeDialog({ returnFocus: sidebar.querySelector('.sidebar-menu-btn') })
      : null,
    onProfile: openProfile,
    onAbout: openSettings,
    onExportAll: () => downloadFile(EXPORT_ALL_URL),
    onCalls: () => router.navigate('calls'),
    onChats: () => router.navigate('home'),
    onSelect: (id) => {
      // Close profile/settings if open before navigating
      closeProfile();
      closeSettings();
      router.navigate('chat', id);
    },
  });

  voiceNoteBar = mountVoiceNoteBar(sidebar, {
    onOpen: (id, messageId) => router.navigate('chat', id, messageId),
  });

  // Lock message link → open DV profile
  const lockLink = sidebar.querySelector('.sidebar-lock-link');
  if (lockLink) lockLink.addEventListener('click', openProfile);

  // Sidebar search
  const conversations = store.getConversations();
  if (conversations.length > 0) {
    // Across every conversation; the results stay in the sidebar while a chat
    // opens, so back on a phone returns to them.
    activeSearch = attachSearch(sidebar, conversations, {
      onConversationClick: (id) => {
        closeProfile();
        closeSettings();
        router.navigate('chat', id);
      },
      scope: () => sidebar.searchScope?.() ?? conversations,
      onMessageClick: (id, messageId, date) => {
        closeProfile();
        closeSettings();
        // Already open: just go to the message. Otherwise open its chat there.
        if (id === currentConversationId && activeLoader) {
          activeLoader.scrollToMessage(messageId, date);
          return;
        }
        router.navigate('chat', id, messageId);
      },
    });
  }

  // ── Router ─────────────────────────────────────────

  const router = new HashRouter();
  router.on('home', () => { routeSeq++; sidebar.showChats?.(); navRail.setActive?.('chats'); showEmptyState(); });

  // The calls screen takes the list's place; the log is one file, fetched
  // the first time it is asked for.
  let callsPromise = null;
  router.on('calls', async () => {
    routeSeq++;
    showEmptyState();
    callsPromise ??= fetch(dataUrl('/data/calls.json')).then(r => r.json()).then(d => d.calls);
    let calls = [];
    try { calls = await callsPromise; } catch { callsPromise = null; }
    const panel = renderCallsPanel({
      calls,
      conversations: store.getConversations(),
      avatarFor: (convId) => AVATARS[convId] || null,
      onOpen: (convId, messageId) => openFromPanel(convId, messageId),
    });
    sidebar.showCalls?.(panel);
    navRail.setActive?.('calls');
  });
  router.on('importantes', (convId) => showImportant(convId));

  router.on('chat', async (id, messageId) => {
    const seq = ++routeSeq;
    const keep = keepPanel;
    keepPanel = false;
    if (messageId) {
      // Look up the date for this message ID; without it the chat still opens.
      const date = await store.findDateForMessage(id, messageId).catch(() => null);
      if (seq !== routeSeq) return;
      if (date) {
        pendingScrollTarget = { conversationId: id, messageId, date };
      }
    }
    // A message opened from the calls or the important messages keeps that
    // screen beside the chat; any other way here (back, a link) shows the list.
    if (!keep) { sidebar.showChats?.(); navRail.setActive?.('chats'); }
    chatFromPanel = keep;
    // Already on screen (back from a panel to the chat being read): leave it
    // where the reader was rather than reopening it.
    if (!messageId && id === currentConversationId && activeLoader) {
      closeProfile();
      closeSettings();
      return;
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
