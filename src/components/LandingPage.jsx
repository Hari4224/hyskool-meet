import React, { useState } from 'react';
import { 
  Video, Plus, Users, Shield, Radio, Phone, Code, CheckCircle, XCircle, 
  ArrowRight, Globe, Lock, Wifi, WifiOff, FileText, Sparkles, Copy, Check
} from 'lucide-react';

export default function LandingPage({ onJoinRoom, onOpenIntegrationModal }) {
  const [roomInput, setRoomInput] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('host');
  const [enableE2EE, setEnableE2EE] = useState(true);
  const [isLanMode, setIsLanMode] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);

  const handleCreateInstant = (e) => {
    e.preventDefault();
    const roomId = roomInput.trim() || `hyskool-${Math.random().toString(36).substring(2, 8)}`;
    onJoinRoom({
      roomId,
      userName: userName.trim() || 'Teacher / Admin',
      userRole,
      enableE2EE,
      isLanMode
    });
  };

  const handleCopySdk = () => {
    const code = `<script src="http://hyskool.com/sdk.js"></script>
<script>
  const meet = new HyskoolMeetSDK({
    domain: "hyskool.com",
    roomName: "Math-101",
    userInfo: { displayName: "Student Alex" }
  });
</script>`;
    navigator.clipboard.writeText(code);
    setCopiedSdk(true);
    setTimeout(() => setCopiedSdk(false), 2000);
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="brand-logo">
          <div className="brand-icon">
            <Video size={24} />
          </div>
          <div>
            <span className="gradient-text">HYSKOOL MEET</span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Self-Hosted Video Conferencing & Digital Classroom
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            className={`badge ${isLanMode ? 'badge-amber' : 'badge-emerald'}`}
            onClick={() => setIsLanMode(!isLanMode)}
            style={{ cursor: 'pointer', border: 'none' }}
            title="Toggle Offline LAN Subnet Mode"
          >
            {isLanMode ? <WifiOff size={14} /> : <Wifi size={14} />}
            {isLanMode ? 'Offline / LAN Mode' : 'Self-Hosted Server Active'}
          </button>
          
          <button className="btn btn-secondary" onClick={onOpenIntegrationModal}>
            <Code size={16} /> Embed & API SDK
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-grid">
        {/* Instant Join Card */}
        <div className="glass-panel hero-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="badge badge-cyan" style={{ width: 'fit-content' }}>
              <Sparkles size={12} /> Instant Classroom & Meeting
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Create or Join Room</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Secure WebRTC video chat, multi-user whiteboard, polls, breakout rooms, and SIP dial-in gateway.
            </p>
          </div>

          <form onSubmit={handleCreateInstant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Dr. Sarah Connor"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Room Code / ID</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. math-class-101 (or leave blank for random)"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select 
                  className="form-input" 
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                >
                  <option value="host">Host / Moderator</option>
                  <option value="attendee">Attendee / Student</option>
                </select>
              </div>

              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <input 
                    type="checkbox" 
                    checked={enableE2EE} 
                    onChange={(e) => setEnableE2EE(e.target.checked)} 
                  />
                  Enable E2EE Security
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
              <Video size={18} /> Launch Meeting Room <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Universal Integration Quick Code Preview */}
        <div className="glass-panel hero-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-purple">
              <Code size={12} /> Embed In Any App (Flutter / Web)
            </span>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleCopySdk}>
              {copiedSdk ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copiedSdk ? 'Copied' : 'Copy JS SDK'}
            </button>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Universal App Embed Code</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Integrate HYSKOOL MEET directly into Flutter mobile apps, React, HTML, or LMS portals on <code style={{ color: '#38bdf8' }}>hyskool.com</code>.
          </p>

          <div className="code-block" style={{ flex: 1, maxHeight: '220px', overflowY: 'auto' }}>
{`<script src="http://hyskool.com/sdk.js"></script>
<script>
  const meet = new HyskoolMeetSDK({
    domain: "hyskool.com",
    roomName: "Math-101",
    parentNode: "#meet-container",
    userInfo: { displayName: "Student Alex" }
  });
</script>`}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onOpenIntegrationModal}>
              <Code size={16} /> Flutter & REST API Details
            </button>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix Banner (Matching standard specification) */}
      <div className="glass-panel matrix-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>HYSKOOL MEET vs Industry Alternatives</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Combining the strengths of TrueConf, Jitsi Meet, BigBlueButton, Rocket.Chat, and Nextcloud Talk into a single self-hosted tool.
            </p>
          </div>
          <span className="badge badge-cyan">All-In-One Solution</span>
        </div>

        <table className="feature-table">
          <thead>
            <tr>
              <th>Solution</th>
              <th>Open-Source</th>
              <th>SIP / H.323 Gateway</th>
              <th>Best For</th>
              <th>Offline / LAN Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TrueConf</td>
              <td><XCircle size={16} color="#f43f5e" /></td>
              <td><CheckCircle size={16} color="#10b981" /></td>
              <td>Enterprises & Govt</td>
              <td><CheckCircle size={16} color="#10b981" /></td>
            </tr>
            <tr>
              <td>Jitsi Meet</td>
              <td><CheckCircle size={16} color="#10b981" /></td>
              <td><XCircle size={16} color="#f43f5e" /></td>
              <td>Basic video chat</td>
              <td><XCircle size={16} color="#f43f5e" /></td>
            </tr>
            <tr>
              <td>BigBlueButton</td>
              <td><CheckCircle size={16} color="#10b981" /></td>
              <td><XCircle size={16} color="#f43f5e" /></td>
              <td>Online learning</td>
              <td><XCircle size={16} color="#f43f5e" /></td>
            </tr>
            <tr>
              <td>Rocket.Chat (+Jitsi)</td>
              <td><CheckCircle size={16} color="#10b981" /></td>
              <td><span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⚠️ (via bridge)</span></td>
              <td>Modular comms</td>
              <td><XCircle size={16} color="#f43f5e" /></td>
            </tr>
            <tr>
              <td>Nextcloud Talk</td>
              <td><CheckCircle size={16} color="#10b981" /></td>
              <td><XCircle size={16} color="#f43f5e" /></td>
              <td>Private cloud use</td>
              <td><span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⚠️ (limited)</span></td>
            </tr>
            <tr style={{ background: 'rgba(6, 182, 212, 0.15)', fontWeight: 700 }}>
              <td style={{ color: '#38bdf8', fontSize: '1rem' }}>✨ HYSKOOL MEET</td>
              <td><CheckCircle size={18} color="#10b981" /></td>
              <td><CheckCircle size={18} color="#10b981" /></td>
              <td style={{ color: '#c084fc' }}>All-in-one Education & Enterprise</td>
              <td><CheckCircle size={18} color="#10b981" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
