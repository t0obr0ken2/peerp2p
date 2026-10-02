import { state, broadcast, addPeer, setActivePeer } from './state.js';
import { updateCallStatus, setStatusBadge, renderPeerList, renderMessages } from './ui.js';

async function ensureMic() {
  if (state.localStream) {
    return state.localStream;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
    echoCancellation: true,
    noiseSuppression: true,
  });

  state.localStream = stream;
  return stream;
}

function getPeerConnection(peerId) {
  if (!state.connections.has(peerId)) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = false;
      audio.playsInline = true;
      state.peerAudio.set(peerId, audio);
      audio.play().catch(() => undefined);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        broadcast({
          type: 'candidate',
          from: state.localId,
          to: peerId,
          payload: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus(`${peerId} connected`);
        renderPeerList();
      }

      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setCallStatus('No active call');
      }
    };

    state.connections.set(peerId, pc);
  }

  return state.connections.get(peerId);
}

export async function initMic() {
  try {
    await ensureMic();
    return true;
  } catch (error) {
    setCallStatus('Microphone permission is required for voice chat');
    return false;
  }
}

export async function requestCall(peerId) {
  const ok = await initMic();
  if (!ok) {
    return;
  }

  const pc = getPeerConnection(peerId);
  if (!state.localStream) {
    return;
  }

  state.localStream.getTracks().forEach((track) => {
    pc.addTrack(track, state.localStream);
  });

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    broadcast({
      type: 'offer',
      from: state.localId,
      to: peerId,
      payload: offer,
    });
    setCallStatus(`Calling ${peerId}...`);
    setActivePeer(peerId);
    renderPeerList();
  } catch (error) {
    setCallStatus('Call setup failed');
  }
}

export function endCall(peerId) {
  if (!peerId) {
    return;
  }

  const pc = state.connections.get(peerId);
  if (pc) {
    pc.close();
    state.connections.delete(peerId);
  }

  const remoteAudio = state.peerAudio.get(peerId);
  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    state.peerAudio.delete(peerId);
  }

  setCallStatus('No active call');
  renderPeerList();
}

export function toggleMic() {
  if (!state.localStream) {
    return;
  }

  const tracks = state.localStream.getAudioTracks();
  state.micMuted = !state.micMuted;

  tracks.forEach((track) => {
    track.enabled = !state.micMuted;
  });

  const btn = document.getElementById('btn-toggle-mic');
  if (btn) {
    btn.textContent = state.micMuted ? 'Mic: Off' : 'Mic: On';
  }
}

export async function handleIncomingSignal(message) {
  const { type, from, to, payload } = message;
  if (!from || (to && to !== state.localId)) {
    return;
  }

  addPeer(from, true);
  const pc = getPeerConnection(from);

  try {
    if (type === 'offer') {
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, state.localStream);
        });
      } else {
        await initMic();
        if (state.localStream) {
          state.localStream.getTracks().forEach((track) => {
            pc.addTrack(track, state.localStream);
          });
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      broadcast({
        type: 'answer',
        from: state.localId,
        to: from,
        payload: answer,
      });
      setActivePeer(from);
      setCallStatus(`Connected to ${from}`);
      renderPeerList();
    }

    if (type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      setActivePeer(from);
      setCallStatus(`Connected to ${from}`);
    }

    if (type === 'candidate') {
      if (payload) {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      }
    }
  } catch (error) {
    setCallStatus('Signal negotiation failed');
  }
}

export function startVoiceOnlyMode() {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    setStatusBadge('READY');
  } else {
    setStatusBadge('NO MIC');
  }
}
