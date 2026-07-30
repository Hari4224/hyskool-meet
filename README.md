# HYSKOOL MEET 🚀

> **Self-Hosted All-In-One Video Conferencing & Digital Classroom Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![WebRTC](https://img.shields.io/badge/Engine-WebRTC-brightgreen.svg)](https://webrtc.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-cyan.svg)](https://www.docker.com/)
[![Google Meet Layout](https://img.shields.io/badge/UI-Google%20Meet%20Style-purple.svg)](#-google-meet-adaptive-layout)

---

## 🌟 Overview

**HYSKOOL MEET** is a feature-packed, self-hosted video conferencing platform engineered to bring together the best capabilities of **TrueConf**, **Jitsi Meet**, **BigBlueButton**, **Rocket.Chat**, and **Nextcloud Talk** into a single, seamless solution.

It features a **Google Meet-inspired adaptive stage**, **Full HD 1080p WebRTC media streaming**, an **Offline/LAN mode**, interactive classroom tools, and a **Universal Integration Suite** designed to easily embed into Flutter mobile apps, Web apps, or LMS platforms.

---

## 📊 Feature Comparison Matrix

| Feature | TrueConf | Jitsi Meet | BigBlueButton | Rocket.Chat | Nextcloud Talk | ✨ **HYSKOOL MEET** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Open-Source & Self-Hosted** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ **100% Self-Hosted** |
| **SIP / H.323 Phone Gateway** | ✅ | ❌ | ❌ | ⚠️ (bridge) | ❌ | ✅ **Built-in Virtual PBX** |
| **Offline / LAN Mode** | ✅ | ❌ | ❌ | ❌ | ⚠️ (limited) | ✅ **Full Offline Support** |
| **Online Learning Suite** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ **Whiteboard, Polls, Notes** |
| **Modular Comms & Rich Chat** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ **Group, Direct & Code Snippets** |
| **Enterprise E2EE & Room Lock** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ **Built-in E2EE & Lobby** |
| **Google Meet Adaptive Layout** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **100% Viewport Stage** |

---

## ✨ Key Features

- **📺 Google Meet Adaptive Stage**: Dynamic 100% screen-fitting grid (`count-1`, `count-2`, `count-4`, `count-many`) with floating glassmorphic name pills and active speaker glow.
- **🎥 Full HD 1080p WebRTC**: High-definition camera capture with built-in Echo Cancellation, Noise Suppression, and dynamic resolution selector (1080p, 720p, 480p).
- **🎨 Interactive Multi-User Whiteboard**: HTML5 Canvas with drawing tools (Pen, Rect, Circle, Line, Eraser, Colors) and image export.
- **📊 Live Polls & Quizzes**: Real-time voting with instant bar chart distribution results.
- **📝 Collaborative Shared Notes**: Real-time markdown editor with `.md` export.
- **📞 SIP / H.323 Gateway**: Virtual phone dialer with DTMF key tones and PBX trunk bridge simulation.
- **🔒 Enterprise Security**: End-to-End Encryption (E2EE) toggle and host-moderated Lobby / Waiting room.
- **📶 Offline & LAN Subnet Mode**: Operates entirely over local Wi-Fi / LAN without requiring an internet connection or external cloud servers.

---

## 🔌 Universal App Integration

Integrate HYSKOOL MEET into any **Flutter mobile app**, **React/Web app**, or **LMS portal** in minutes.

### 📱 1. Flutter Mobile App Integration (HYSKOOL PRIME)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class HyskoolMeetScreen extends StatelessWidget {
  final String roomCode = "math-101";
  final String userName = "Alex";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('HYSKOOL Live Meeting')),
      body: InAppWebView(
        initialUrlRequest: URLRequest(
          url: WebUri('https://hyskool-meet.onrender.com/?room=$roomCode&name=$userName&embed=true'),
        ),
        initialSettings: InAppWebViewSettings(
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserGesture: false,
        ),
        onPermissionRequest: (controller, request) async {
          return PermissionResponse(
            resources: request.resources,
            action: PermissionResponseAction.GRANT,
          );
        },
      ),
    );
  }
}
```

### 🌐 2. Web JavaScript SDK (`HyskoolMeetSDK`)

```html
<div id="meet-container" style="width: 100%; height: 600px;"></div>

<script src="https://hyskool-meet.onrender.com/sdk.js"></script>
<script>
  const meet = new HyskoolMeetSDK({
    domain: "hyskool-meet.onrender.com",
    roomName: "physics-101",
    parentNode: "#meet-container",
    userInfo: { displayName: "Student Alex" }
  });
</script>
```

### 📡 3. REST API Programmatic Room Creation

```bash
curl -X POST https://hyskool-meet.onrender.com/api/v1/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quantum Physics Lecture",
    "host": "Prof. Feynman",
    "e2ee": true
  }'
```

---

## 🚀 Quick Start & Deployment

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/Hari4224/hyskool-meet.git
cd hyskool-meet

# Install dependencies
npm install

# Build Vite assets & start server
npm run build
npm start
```
Access the application at `http://localhost:5000`.

---

### 2. Docker One-Command Deployment 🐳

```bash
docker compose up -d
```

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO, JSONWebTokens, CORS.
- **Frontend**: React 18, Vite, Lucide Icons, Canvas API, Web Audio API, Native WebRTC.
- **Styling**: Vanilla CSS Design Tokens (Dark Glassmorphism, Google Meet Layout System).

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
