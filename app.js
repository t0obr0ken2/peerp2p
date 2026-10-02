import { state, addPeer, announcePresence, removePeer, broadcast, setActivePeer } from './src/state.js';
import { bindUI, renderPeerList, renderMessages, setStatusBadge, setCallStatus, updateLocalPeerId } from './src/ui.js';
import {
  initMic,
  requestCall,
  endCall,
  toggleMic,
  handleIncomingSignal,
  startVoiceOnlyMode,
} from './src/rtc.js';

const channel = new BroadcastChannel('peerp2p_voice_channel');
state.channel = channel;
state.localId = `Peer-${Math.floor(1000 + Math.random() * 9000)}`;

const dom = bindUI();
updateLocalPeerId(state.localId);
renderPeerList();
renderMessages();

const botPeer = 'peerp2p-Bot';
addPeer(botPeer, true);
state.activePeer = botPeer;
setActivePeer(botPeer);
renderPeerList();

const makeMessage = (text, kind = 'system', sender = 'System') => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sender,
  text,
  kind,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

state.messages.push(makeMessage('Welcome to peerp2p voice mode. No video is used — audio only.', 'system', 'System'));
renderMessages();

channel.onmessage = (event) => {
  const message = event.data;
  if (!message || !message.type || message.from === state.localId) {
    return;
  }

  if (message.type === 'presence') {
    addPeer(message.from, message.online ?? true);
    if (message.from !== state.localId) {
      state.messages.push(makeMessage(`${message.from} is online.`, 'system', 'System'));
      renderMessages();
    }
    return;
  }

  if (message.type === 'leave') {
    removePeer(message.from);
    state.messages.push(makeMessage(`${message.from} disconnected.`, 'system', 'System'));
    renderMessages();
    return;
  }

  if (message.type === 'chat') {
    addPeer(message.from, true);
    state.messages.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender: message.from,
      text: message.text,
      kind: 'remote',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    renderMessages();
    return;
  }

  if (['offer', 'answer', 'candidate'].includes(message.type)) {
    handleIncomingSignal(message);
  }
};

dom.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.localId);
    setStatusBadge('COPIED');
    setTimeout(() => setStatusBadge('READY'), 1100);
  } catch (error) {
    state.messages.push(makeMessage('Clipboard access failed, but your ID is shown in the sidebar.', 'system', 'System'));
    renderMessages();
  }
});

dom.callBtn.addEventListener('click', async () => {
  if (!state.activePeer) {
    state.messages.push(makeMessage('Select a peer first.', 'system', 'System'));
    renderMessages();
    return;
  }

  await requestCall(state.activePeer);
});

dom.hangupBtn.addEventListener('click', () => {
  endCall(state.activePeer);
});

dom.toggleMicBtn.addEventListener('click', async () => {
  await initMic();
  toggleMic();
});

dom.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = dom.messageInput;
  const text = input.value.trim();

  if (!text) {
    return;
  }

  const peer = state.activePeer || 'peerp2p-Bot';
  const msg = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender: 'You',
    text,
    kind: 'local',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  state.messages.push(msg);
  renderMessages();
  broadcast({
    type: 'chat',
    from: state.localId,
    to: peer,
    text,
  });
  input.value = '';
});

function pollPresence() {
  announcePresence();
  setTimeout(pollPresence, 7000);
}

announcePresence();
startVoiceOnlyMode();
setTimeout(pollPresence, 1200);
