import React, { useState } from 'react';
import { Code, Copy, Check, X, Smartphone, Globe, Terminal, Webhook } from 'lucide-react';

export default function IntegrationModal({ roomId, onClose }) {
  const [activeTab, setActiveTab] = useState('flutter');
  const [copied, setCopied] = useState(false);

  const domain = 'hyskool.com';
  const targetRoom = roomId || 'math-class-101';

  const snippets = {
    flutter: `// Flutter App Integration (InAppWebView / Webview)
// Add dependency: flutter_inappwebview: ^6.0.0

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class HyskoolMeetScreen extends StatelessWidget {
  final String roomName = "${targetRoom}";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('HYSKOOL Live Video Class')),
      body: InAppWebView(
        initialUrlRequest: URLRequest(
          url: WebUri('http://${domain}/?room=$roomName&embed=true'),
        ),
        initialSettings: InAppWebViewSettings(
          mediaPlaybackRequiresUserGesture: false,
          allowsInlineMediaPlayback: true,
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
}`,

    javascript: `<!-- Embed HYSKOOL MEET JS SDK into any Web App -->
<div id="meet-container" style="width: 100%; height: 600px;"></div>

<script src="http://${domain}/sdk.js"></script>
<script>
  const meet = new HyskoolMeetSDK({
    domain: "${domain}",
    roomName: "${targetRoom}",
    parentNode: "#meet-container",
    userInfo: {
      displayName: "Student Alex",
      role: "attendee"
    }
  });

  // Listen to meeting events
  meet.on('participantJoined', (participant) => {
    console.log('User Joined:', participant.name);
  });
</script>`,

    rest: `# Create Room Programmatically via REST API
curl -X POST http://${domain}/api/v1/rooms \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Quantum Physics Lecture",
    "host": "Prof. Feynman",
    "e2ee": true,
    "lanOnly": false
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "roomId": "${targetRoom}",
#     "joinUrl": "http://${domain}/?room=${targetRoom}",
#     "token": "eyJhbGciOiJIUzI1Ni..."
#   }
# }`,

    webhook: `// Server-to-Server Webhook Payload Example
// Configure target URL in http://${domain}/api/v1/webhooks

{
  "event": "room.participant_joined",
  "timestamp": "2026-07-30T14:30:00.000Z",
  "data": {
    "roomId": "${targetRoom}",
    "user": {
      "name": "Dr. Sarah Connor",
      "role": "host"
    }
  }
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Universal App Integration Portal</h3>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Embed HYSKOOL MEET into any Flutter app, web app, or backend portal hosted on <code style={{ color: '#38bdf8' }}>{domain}</code>.
          </p>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--glass-border)', paddingBottom: 8 }}>
            <button 
              className={`btn btn-secondary ${activeTab === 'flutter' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setActiveTab('flutter')}
            >
              <Smartphone size={14} /> Flutter Mobile App
            </button>

            <button 
              className={`btn btn-secondary ${activeTab === 'javascript' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setActiveTab('javascript')}
            >
              <Globe size={14} /> Web JS SDK
            </button>

            <button 
              className={`btn btn-secondary ${activeTab === 'rest' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setActiveTab('rest')}
            >
              <Terminal size={14} /> REST API (cURL)
            </button>

            <button 
              className={`btn btn-secondary ${activeTab === 'webhook' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setActiveTab('webhook')}
            >
              <Webhook size={14} /> Webhooks
            </button>
          </div>

          {/* Code Snippet Box */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary"
              style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', fontSize: '0.75rem', zIndex: 5 }}
              onClick={handleCopy}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Snippet'}
            </button>

            <pre className="code-block" style={{ minHeight: '260px', maxHeight: '340px' }}>
              {snippets[activeTab]}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
