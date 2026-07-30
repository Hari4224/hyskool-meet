import React, { useState, useEffect } from 'react';
import VideoGrid from './VideoGrid';
import ControlBar from './ControlBar';
import Whiteboard from './Whiteboard';
import ChatPanel from './ChatPanel';
import PollsModal from './PollsModal';
import SIPDialerModal from './SIPDialerModal';
import SharedNotes from './SharedNotes';
import IntegrationModal from './IntegrationModal';

import { Shield, Lock, Wifi, WifiOff, Users, Radio, AlertCircle, Sparkles } from 'lucide-react';

export default function MeetingRoom({ 
  socket, 
  roomData, 
  onLeaveMeeting,
  onOpenIntegrationModal
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isE2EE, setIsE2EE] = useState(roomData?.enableE2EE ?? true);
  const [isLocked, setIsLocked] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'whiteboard', 'chat', 'polls', 'notes', 'sip', null

  const [videoQuality, setVideoQuality] = useState('1080p'); // '1080p', '720p', '480p'

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [whiteboardElements, setWhiteboardElements] = useState([]);
  const [sharedNotes, setSharedNotes] = useState('');
  const [polls, setPolls] = useState([]);

  // Initialize WebRTC High Definition (HD/1080p) Local Media Stream
  useEffect(() => {
    async function initMedia() {
      try {
        if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
        }

        const widthConstraint = videoQuality === '1080p' ? { ideal: 1920, min: 1280 } : videoQuality === '720p' ? { ideal: 1280, min: 960 } : { ideal: 640 };
        const heightConstraint = videoQuality === '1080p' ? { ideal: 1080, min: 720 } : videoQuality === '720p' ? { ideal: 720, min: 540 } : { ideal: 480 };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: widthConstraint,
            height: heightConstraint,
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setLocalStream(stream);
      } catch (err) {
        console.warn('HD video permission fallback to standard mode:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(fallbackStream);
        } catch (e) {
          console.warn('Media devices unavailable:', e);
        }
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoQuality]);

  // Socket.IO Room Connection
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', {
      roomId: roomData.roomId,
      userName: roomData.userName,
      userRole: roomData.userRole
    });

    socket.on('room-joined', (data) => {
      setParticipants(data.participants.filter(p => p.id !== socket.id));
      if (data.whiteboardElements) setWhiteboardElements(data.whiteboardElements);
      if (data.sharedNotes) setSharedNotes(data.sharedNotes);
      if (data.polls) setPolls(data.polls);
      setIsLocked(!!data.isLocked);
      setIsE2EE(!!data.isE2EE);
    });

    socket.on('user-connected', ({ user, participants: allParticipants }) => {
      setParticipants(allParticipants.filter(p => p.id !== socket.id));
    });

    socket.on('user-disconnected', ({ userId, participants: allParticipants }) => {
      setParticipants(allParticipants.filter(p => p.id !== socket.id));
    });

    socket.on('media-state-changed', ({ participants: updatedParticipants }) => {
      setParticipants(updatedParticipants.filter(p => p.id !== socket.id));
    });

    socket.on('poll-created', (newPoll) => {
      setPolls(prev => [...prev, newPoll]);
    });

    socket.on('poll-updated', (updatedPoll) => {
      setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    });

    socket.on('room-lock-changed', (locked) => {
      setIsLocked(locked);
    });

    socket.on('e2ee-changed', (e2ee) => {
      setIsE2EE(e2ee);
    });

    return () => {
      socket.off('room-joined');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('media-state-changed');
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('room-lock-changed');
      socket.off('e2ee-changed');
    };
  }, [socket, roomData]);

  // Mic Toggle
  const handleToggleMic = () => {
    const nextState = !micOn;
    setMicOn(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = nextState; });
    }
    if (socket) {
      socket.emit('update-media-state', { audioMuted: !nextState });
    }
  };

  // Cam Toggle
  const handleToggleCam = () => {
    const nextState = !camOn;
    setCamOn(nextState);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = nextState; });
    }
    if (socket) {
      socket.emit('update-media-state', { videoMuted: !nextState });
    }
  };

  // Screen Share Toggle
  const handleToggleScreen = async () => {
    if (screenOn) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      setScreenStream(null);
      setScreenOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setScreenOn(true);
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setScreenOn(false);
        };
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  // Panel Toggle
  const handleTogglePanel = (panelName) => {
    setActivePanel(prev => prev === panelName ? null : panelName);
  };

  // Hand Raise Toggle
  const handleToggleHand = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (socket) {
      socket.emit('update-media-state', { handRaised: nextState });
    }
  };

  // Local Recording Toggle
  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // E2EE Toggle
  const handleToggleE2EE = () => {
    const nextState = !isE2EE;
    setIsE2EE(nextState);
    if (socket) socket.emit('toggle-e2ee', nextState);
  };

  // Lock Toggle
  const handleToggleLock = () => {
    const nextState = !isLocked;
    setIsLocked(nextState);
    if (socket) socket.emit('toggle-room-lock', nextState);
  };

  return (
    <div className="meeting-workspace">
      {/* Top Header Status Bar */}
      <header className="meeting-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#38bdf8' }}>HYSKOOL MEET</span>
          <span className="badge badge-purple">Room: {roomData.roomId}</span>
          {isE2EE && <span className="badge badge-cyan"><Shield size={12} /> E2EE Active</span>}
          {isLocked && <span className="badge badge-amber"><Lock size={12} /> Room Locked</span>}
        </div>

        {/* Video High Definition Quality Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Sparkles size={14} color="#38bdf8" />
            <select 
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              <option value="1080p" style={{ background: '#1e1f20' }}>1080p Full HD</option>
              <option value="720p" style={{ background: '#1e1f20' }}>720p HD</option>
              <option value="480p" style={{ background: '#1e1f20' }}>480p Standard</option>
            </select>
          </div>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
            {participants.length + 1} Participants
          </span>
          {isRecording && (
            <span className="badge badge-rose" style={{ background: 'rgba(234,67,53,0.2)', color: '#ea4335', border: '1px solid rgba(234,67,53,0.4)' }}>
              <Radio size={12} className="pulse" /> Recording
            </span>
          )}
        </div>
      </header>

      {/* Main Meeting Body (GMeet Adaptive Full Stage) */}
      <div className="meeting-body">
        {/* Video Grid Stage */}
        <VideoGrid 
          localStream={localStream}
          localUser={{
            name: roomData.userName,
            audioMuted: !micOn,
            videoMuted: !camOn,
            handRaised
          }}
          participants={participants}
          screenStream={screenStream}
          isRecording={isRecording}
          isE2EE={isE2EE}
          videoQuality={videoQuality}
        />

        {/* Side Panels */}
        {activePanel === 'whiteboard' && (
          <div className="sidebar-panel" style={{ width: '600px' }}>
            <Whiteboard socket={socket} roomId={roomData.roomId} initialElements={whiteboardElements} />
          </div>
        )}

        {activePanel === 'chat' && (
          <ChatPanel 
            socket={socket} 
            roomId={roomData.roomId} 
            currentUser={{ name: roomData.userName, id: socket?.id }}
            participants={participants}
            onClose={() => setActivePanel(null)}
          />
        )}

        {activePanel === 'notes' && (
          <SharedNotes 
            socket={socket} 
            roomId={roomData.roomId} 
            initialNotes={sharedNotes} 
            onClose={() => setActivePanel(null)} 
          />
        )}
      </div>

      {/* Control Action Bar */}
      <ControlBar 
        micOn={micOn}
        camOn={camOn}
        screenOn={screenOn}
        activePanel={activePanel}
        handRaised={handRaised}
        isRecording={isRecording}
        isE2EE={isE2EE}
        isLocked={isLocked}
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onToggleScreen={handleToggleScreen}
        onTogglePanel={handleTogglePanel}
        onToggleHand={handleToggleHand}
        onToggleRecording={handleToggleRecording}
        onToggleE2EE={handleToggleE2EE}
        onToggleLock={handleToggleLock}
        onOpenIntegrationModal={onOpenIntegrationModal}
        onLeaveMeeting={onLeaveMeeting}
      />

      {/* Modals */}
      {activePanel === 'polls' && (
        <PollsModal socket={socket} roomId={roomData.roomId} polls={polls} onClose={() => setActivePanel(null)} />
      )}

      {activePanel === 'sip' && (
        <SIPDialerModal socket={socket} roomId={roomData.roomId} onClose={() => setActivePanel(null)} />
      )}
    </div>
  );
}
