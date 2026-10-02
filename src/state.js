export const state = {
  localId: '',
  activePeer: null,
  peers: new Map(),
  connections: new Map(),
  localStream: null,
  channel: null,
  micMuted: false,
  messages: [],
  peerAudio: new Map(),
};

export function setActivePeer(peerId) {
  state.activePeer = peerId;
}

export function addPeer(peerId, online = true) {
  if (!peerId || peerId === state.localId) {
    return;
  }

  state.peers.set(peerId, { id: peerId, online });
}

export function removePeer(peerId) {
  state.peers.delete(peerId);
  if (state.activePeer === peerId) {
    state.activePeer = null;
  }
}

export function announcePresence() {
  if (!state.channel) {
    return;
  }

  state.channel.postMessage({
    type: 'presence',
    from: state.localId,
    online: true,
  });
}

export function broadcast(signal) {
  if (!state.channel) {
    return;
  }

  state.channel.postMessage(signal);
}

export function setLocalPeerId(id) {
  state.localId = id;
}
