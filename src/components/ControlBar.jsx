import React from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, PenTool, MessageSquare, 
  BarChart2, PhoneCall, Shield, Disc, Hand, Users, FileText, PhoneOff, Code, Lock
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
  onOpenIntegrationModal,
  onLeaveMeeting
}) {
  return (
    <div className="control-bar">
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
        <Disc size={20} color={isRecording ? '#f43f5e' : undefined} />
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
