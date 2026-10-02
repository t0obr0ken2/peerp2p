export function bindUI() {
  return {
    copyBtn: document.getElementById('btn-copy'),
    callBtn: document.getElementById('btn-call'),
    hangupBtn: document.getElementById('btn-hangup'),
    toggleMicBtn: document.getElementById('btn-toggle-mic'),
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    peerList: document.getElementById('peer-list'),
    messagesContainer: document.getElementById('messages-container'),
    chatTitle: document.getElementById('chat-title'),
    callStatus: document.getElementById('call-status'),
    statusBadge: document.getElementById('status-badge'),
    myPeerId: document.getElementById('my-peer-id'),
  };
}

export function updateLocalPeerId(id) {
  const element = document.getElementById('my-peer-id');
  if (element) {
    element.textContent = id;
  }
}

export function setStatusBadge(text) {
  const badge = document.getElementById('status-badge');
  if (badge) {
    badge.textContent = text;
    badge.classList.toggle('offline', text === 'NO MIC');
  }
}

export function setCallStatus(text) {
  const element = document.getElementById('call-status');
  if (element) {
    element.textContent = text;
  }
}

export function renderPeerList() {
  const { peerList } = bindUI();
  const list = document.getElementById('peer-list');
  if (!list) {
    return;
  }

  const peers = Array.from(globalThis.peerp2p?.peers ?? []);
  if (!peers.length) {
    list.innerHTML = '<li class="peer-item"><span class="peer-name">No peers yet</span></li>';
    return;
  }

  list.innerHTML = peers
    .map(([peerId, item]) => {
      const isActive = globalThis.peerp2p?.activePeer === peerId;
      const liveClass = item.online ? 'live' : '';
      return `
        <li class="peer-item ${isActive ? 'active' : ''}" data-peer="${peerId}">
          <span class="peer-name"><span class="peer-status ${liveClass}"></span>${peerId}</span>
        </li>
      `;
    })
    .join('');

  list.querySelectorAll('.peer-item[data-peer]').forEach((item) => {
    item.addEventListener('click', () => {
      const selected = item.dataset.peer;
      globalThis.peerp2p.activePeer = selected;
      const title = document.getElementById('chat-title');
      if (title) {
        title.textContent = selected;
      }
      renderPeerList();
    });
  });
}

export function renderMessages() {
  const container = document.getElementById('messages-container');
  if (!container) {
    return;
  }

  const messages = globalThis.peerp2p?.messages ?? [];
  container.innerHTML = messages
    .map((entry) => `
      <div class="message ${entry.kind}">
        <div class="message-header">
          <strong>${entry.sender}</strong>
          <span>${entry.time}</span>
        </div>
        <div class="message-text">${entry.text}</div>
      </div>
    `)
    .join('');

  container.scrollTop = container.scrollHeight;
}

export function installGlobalAppState() {
  globalThis.peerp2p = {
    activePeer: 'peerp2p-Bot',
    peers: new Map(),
    messages: [],
  };
}

export function setActivePeer(peerId) {
  if (globalThis.peerp2p) {
    globalThis.peerp2p.activePeer = peerId;
    const title = document.getElementById('chat-title');
    if (title) {
      title.textContent = peerId;
    }
  }
}
