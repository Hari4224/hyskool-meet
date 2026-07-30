import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, PenTool, MessageSquare, 
  BarChart2, PhoneCall, Shield, Disc, Hand, Users, FileText, PhoneOff, Code, Lock, Smile
} from 'lucide-react';

export default function ControlBar({
  micOn,
  camOn,
  screenOn,
  activePanel,
  handRaised,
  isRecording,
  isE2EE,
  isLocked,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  onTogglePanel,
  onToggleHand,
  onToggleRecording,
  onToggleE2EE,
  onToggleLock,
  onSendReaction,
  onOpenIntegrationModal,
  onLeaveMeeting
}) {
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const emojis = ['👍', '❤️', '👏', '🎉', '🔥', '🤣'];

  const handleSelectEmoji = (emoji) => {
    if (onSendReaction) onSendReaction(emoji);
    setShowEmojiMenu(false);
  };

  return (
    <div className="control-bar" style={{ position: 'relative' }}>
      {/* Audio Toggle */}
      <button 
        className={`control-btn ${micOn ? '' : 'off'}`} 
        onClick={onToggleMic}
        title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      {/* Camera Toggle */}
      <button 
        className={`control-btn ${camOn ? '' : 'off'}`} 
        onClick={onToggleCam}
        title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {camOn ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      {/* Screen Share */}
      <button 
        className={`control-btn ${screenOn ? 'active' : ''}`} 
        onClick={onToggleScreen}
        title="Share Screen"
      >
        <Monitor size={20} />
      </button>

      {/* Jitsi Meet Live Reaction Emojis */}
      <button 
        className={`control-btn ${showEmojiMenu ? 'active' : ''}`} 
        onClick={() => setShowEmojiMenu(!showEmojiMenu)}
        title="Send Reaction Emoji"
      >
        <Smile size={20} />
      </button>

      {/* Floating Emoji Picker Menu */}
      {showEmojiMenu && (
        <div style={{
          position: 'absolute',
          bottom: '88px',
          background: '#ffffff',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          gap: 12,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          border: '1px solid var(--glass-border)',
          zIndex: 100
        }}>
          {emojis.map(e => (
            <button 
              key={e}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(el) => el.target.style.transform = 'scale(1.3)'}
              onMouseLeave={(el) => el.target.style.transform = 'scale(1)'}
              onClick={() => handleSelectEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Whiteboard Toggle (BigBlueButton feature) */}
      <button 
        className={`control-btn ${activePanel === 'whiteboard' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('whiteboard')}
        title="Interactive Whiteboard & Slides"
      >
        <PenTool size={20} />
      </button>

      {/* In-Meeting Chat (Rocket.Chat feature) */}
      <button 
        className={`control-btn ${activePanel === 'chat' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('chat')}
        title="Chat & Messaging"
      >
        <MessageSquare size={20} />
      </button>

      {/* Live Polls & Quizzes */}
      <button 
        className={`control-btn ${activePanel === 'polls' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('polls')}
        title="Live Polls & Quizzes"
      >
        <BarChart2 size={20} />
      </button>

      {/* Shared Notes Pad */}
      <button 
        className={`control-btn ${activePanel === 'notes' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('notes')}
        title="Collaborative Shared Notes"
      >
        <FileText size={20} />
      </button>

      {/* SIP / H.323 Virtual Dialer (TrueConf feature) */}
      <button 
        className={`control-btn ${activePanel === 'sip' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('sip')}
        title="SIP / PSTN Phone Dialer Bridge"
      >
        <PhoneCall size={20} />
      </button>

      {/* Raise Hand */}
      <button 
        className={`control-btn ${handRaised ? 'active' : ''}`} 
        onClick={onToggleHand}
        title="Raise / Lower Hand"
      >
        <Hand size={20} />
      </button>

      {/* Local Recording */}
      <button 
        className={`control-btn ${isRecording ? 'off' : ''}`} 
        onClick={onToggleRecording}
        title={isRecording ? 'Stop Recording' : 'Start Local Recording'}
      >
        <Disc size={20} color={isRecording ? '#ef4444' : undefined} />
      </button>

      {/* Security E2EE & Lock */}
      <button 
        className={`control-btn ${isE2EE ? 'active' : ''}`} 
        onClick={onToggleE2EE}
        title="End-to-End Encryption (E2EE)"
      >
        <Shield size={20} />
      </button>

      <button 
        className={`control-btn ${isLocked ? 'active' : ''}`} 
        onClick={onToggleLock}
        title={isLocked ? 'Unlock Room' : 'Lock Room (Enable Lobby)'}
      >
        <Lock size={20} />
      </button>

      {/* App Integration Modal Trigger */}
      <button 
        className="control-btn" 
        onClick={onOpenIntegrationModal}
        title="Embed Code & API SDK"
      >
        <Code size={20} />
      </button>

      {/* Leave Meeting */}
      <button 
        className="control-btn off" 
        onClick={onLeaveMeeting}
        style={{ marginLeft: 16 }}
        title="Leave Meeting"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
}
