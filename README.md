# peerp2p Voice App

A fast static HTML app for local peer-to-peer voice chat with no video. It uses browser audio APIs and `BroadcastChannel` for local signaling, so it works well for browser tabs on the same machine or in the same local environment.

## Features

- Voice-only WebRTC audio calls
- No video streams
- Local peer list with simple presence updates
- Mic mute toggle
- Copyable peer ID
- Text chat support alongside voice
- Fast static deployment

## Run locally

1. Open a terminal in the repo.
2. Start a tiny local web server:

```bash
python3 -m http.server 8000
```

3. Open in a browser:

```text
http://localhost:8000
```

4. Open a second tab to create a second peer and test voice calls.

## Notes

- This is designed for local single-device or same-browser testing.
- For real cross-device internet use, you would need a signaling server such as Socket.IO, WebRTC TURN, or a hosted relay service.
- Video is intentionally disabled.
