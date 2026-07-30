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
  unreadChatCount = 0,
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

  const handleSelectEmoji = (e, emoji) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSendReaction) {
      onSendReaction(emoji);
    }
    setShowEmojiMenu(false);
  };

  return (
    <div className="control-bar" style={{ position: 'relative' }}>
      {/* Audio Toggle */}
      <button 
        type="button"
        className={`control-btn ${micOn ? '' : 'off'}`} 
        onClick={onToggleMic}
        title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      {/* Camera Toggle */}
      <button 
        type="button"
        className={`control-btn ${camOn ? '' : 'off'}`} 
        onClick={onToggleCam}
        title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {camOn ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      {/* Screen Share */}
      <button 
        type="button"
        className={`control-btn ${screenOn ? 'active' : ''}`} 
        onClick={onToggleScreen}
        title="Share Screen"
      >
        <Monitor size={20} />
      </button>

      {/* Jitsi Meet Live Reaction Emojis */}
      <button 
        type="button"
        className={`control-btn ${showEmojiMenu ? 'active' : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          setShowEmojiMenu(!showEmojiMenu);
        }}
        title="Send Reaction Emoji"
      >
        <Smile size={20} />
      </button>

      {/* Floating Emoji Picker Menu */}
      {showEmojiMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '88px',
            background: '#ffffff',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            gap: 12,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--glass-border)',
            zIndex: 999
          }}
        >
          {emojis.map(emoji => (
            <button 
              key={emoji}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                padding: '4px'
              }}
              onClick={(e) => handleSelectEmoji(e, emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Whiteboard Toggle */}
      <button 
        type="button"
        className={`control-btn ${activePanel === 'whiteboard' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('whiteboard')}
        title="Interactive Whiteboard & Slides"
      >
        <PenTool size={20} />
      </button>

      {/* In-Meeting Chat */}
      <button 
        type="button"
        className={`control-btn ${activePanel === 'chat' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('chat')}
        title="Chat & Messaging"
        style={{ position: 'relative' }}
      >
        <MessageSquare size={20} />
        {unreadChatCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: 20,
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
            border: '2px solid #ffffff'
          }}>
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </button>

      {/* Live Polls & Quizzes */}
      <button 
        type="button"
        className={`control-btn ${activePanel === 'polls' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('polls')}
        title="Live Polls & Quizzes"
      >
        <BarChart2 size={20} />
      </button>

      {/* Shared Notes Pad */}
      <button 
        type="button"
        className={`control-btn ${activePanel === 'notes' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('notes')}
        title="Collaborative Shared Notes"
      >
        <FileText size={20} />
      </button>

      {/* SIP / H.323 Virtual Dialer */}
      <button 
        type="button"
        className={`control-btn ${activePanel === 'sip' ? 'active' : ''}`} 
        onClick={() => onTogglePanel('sip')}
        title="SIP / PSTN Phone Dialer Bridge"
      >
        <PhoneCall size={20} />
      </button>

      {/* Raise Hand */}
      <button 
        type="button"
        className={`control-btn ${handRaised ? 'active' : ''}`} 
        onClick={onToggleHand}
        title="Raise / Lower Hand"
      >
        <Hand size={20} />
      </button>

      {/* Local Recording */}
      <button 
        type="button"
        className={`control-btn ${isRecording ? 'off' : ''}`} 
        onClick={onToggleRecording}
        title={isRecording ? 'Stop Recording' : 'Start Local Recording'}
      >
        <Disc size={20} color={isRecording ? '#ef4444' : undefined} />
      </button>

      {/* Security E2EE & Lock */}
      <button 
        type="button"
        className={`control-btn ${isE2EE ? 'active' : ''}`} 
        onClick={onToggleE2EE}
        title="End-to-End Encryption (E2EE)"
      >
        <Shield size={20} />
      </button>

      <button 
        type="button"
        className={`control-btn ${isLocked ? 'active' : ''}`} 
        onClick={onToggleLock}
        title={isLocked ? 'Unlock Room' : 'Lock Room (Enable Lobby)'}
      >
        <Lock size={20} />
      </button>

      {/* App Integration Modal Trigger */}
      <button 
        type="button"
        className="control-btn" 
        onClick={onOpenIntegrationModal}
        title="Embed Code & API SDK"
      >
        <Code size={20} />
      </button>

      {/* Leave Meeting */}
      <button 
        type="button"
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
