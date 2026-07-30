import React, { useState, useEffect, useRef } from 'react';
import VideoGrid from './VideoGrid';
import ControlBar from './ControlBar';
import Whiteboard from './Whiteboard';
import ChatPanel from './ChatPanel';
import PollsModal from './PollsModal';
import SIPDialerModal from './SIPDialerModal';
import SharedNotes from './SharedNotes';
import IntegrationModal from './IntegrationModal';

import { Shield, Lock, Users, Radio, Sparkles, Volume2 } from 'lucide-react';

// Enterprise-Grade ICE Servers (STUN & TURN Relays for NAT/Firewall Traversal)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

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
  const [activePanel, setActivePanel] = useState(null);
  const [videoQuality, setVideoQuality] = useState('1080p');
  const [audioBlocked, setAudioBlocked] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);

  const [screenStream, setScreenStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // Map<socketId, MediaStream>

  const [whiteboardElements, setWhiteboardElements] = useState([]);
  const [sharedNotes, setSharedNotes] = useState('');
  const [polls, setPolls] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // PeerConnections Ref: Map<socketId, RTCPeerConnection>
  const peerConnections = useRef(new Map());
  // ICE Candidate Queues: Map<socketId, RTCIceCandidate[]>
  const iceCandidatesQueue = useRef(new Map());

  const handleSendReaction = (emoji) => {
    const reaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      senderName: roomData.userName
    };
    setFloatingReactions(prev => [...prev, reaction]);
    if (socket) socket.emit('send-reaction', reaction);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3500);
  };

  // 1. Initialize Local HD Media Stream ONCE on mount
  useEffect(() => {
    let currentStream = null;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        currentStream = stream;
        setLocalStream(stream);
        localStreamRef.current = stream;

      } catch (err) {
        console.warn('HD camera fallback to standard constraints:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          currentStream = fallbackStream;
          setLocalStream(fallbackStream);
          localStreamRef.current = fallbackStream;
        } catch (e) {
          console.error('Media devices access error:', e);
        }
      }
    }

    initMedia();

    // Global click listener to unlock Web Audio Autoplay Policy on modern browsers
    const handleGlobalClick = () => {
      setAudioBlocked(false);
      document.querySelectorAll('audio, video').forEach(media => {
        media.play().catch(() => {});
      });
    };
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run ONCE on mount so stream is never recreated unnecessarily

  // 2. Dynamic Video Quality Constraint Adjuster (Without destroying peer connections or causing black screens!)
  useEffect(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack && videoTrack.applyConstraints) {
      const widthConstraint = videoQuality === '1080p' ? { ideal: 1920 } : videoQuality === '720p' ? { ideal: 1280 } : { ideal: 640 };
      const heightConstraint = videoQuality === '1080p' ? { ideal: 1080 } : videoQuality === '720p' ? { ideal: 720 } : { ideal: 480 };

      videoTrack.applyConstraints({
        width: widthConstraint,
        height: heightConstraint
      }).catch(err => console.warn('applyConstraints resolution change notice:', err));
    }
  }, [videoQuality, localStream]);

  // 3. WebRTC PeerConnection Lifecycle & Socket Signaling Engine
  useEffect(() => {
    if (!socket || !localStream) return;

    // Join Socket Room once local media is ready
    socket.emit('join-room', {
      roomId: roomData.roomId,
      userName: roomData.userName,
      userRole: roomData.userRole
    });

    // Helper: Create RTCPeerConnection for a target peer
    const createPeerConnection = (targetId, isInitiator) => {
      if (peerConnections.current.has(targetId)) {
        return peerConnections.current.get(targetId);
      }

      console.log(`[WebRTC Engine] Creating RTCPeerConnection for target: ${targetId} (Initiator: ${isInitiator})`);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(targetId, pc);

      // Add local media tracks (Audio & Video) to PeerConnection
      const activeStream = localStreamRef.current || localStream;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            targetId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      // Handle Connection State Changes (Auto-reconnect on failure)
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC Connection State] Peer ${targetId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          pc.restartIce();
        }
      };

      // Handle Remote Audio & Video Tracks Aggregation
      pc.ontrack = (event) => {
        console.log(`[WebRTC Track Received] Kind: ${event.track.kind} From ${targetId}`);
        
        setRemoteStreams(prev => {
          const updated = new Map(prev);
          let peerStream = updated.get(targetId);

          if (!peerStream) {
            peerStream = event.streams[0] ? new MediaStream(event.streams[0].getTracks()) : new MediaStream();
          }

          if (!peerStream.getTracks().some(t => t.id === event.track.id)) {
            peerStream.addTrack(event.track);
          }

          // Force new MediaStream reference with all accumulated audio and video tracks
          updated.set(targetId, new MediaStream(peerStream.getTracks()));
          return updated;
        });

        // Test browser audio playback
        const audioTest = new Audio();
        audioTest.srcObject = event.streams[0] || new MediaStream([event.track]);
        audioTest.play().catch(() => setAudioBlocked(true));
      };

      // If Initiator: Create Offer with explicit audio/video SDP
      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('signal', {
              targetId,
              signal: { type: 'offer', sdp: pc.localDescription }
            });
          })
          .catch((err) => console.error('[WebRTC Offer Error]:', err));
      }

      return pc;
    };

    // Socket Event: Room Joined
    socket.on('room-joined', (data) => {
      const allPeers = data.participants.filter(p => p.id !== socket.id);
      setParticipants(allPeers);
      if (data.whiteboardElements) setWhiteboardElements(data.whiteboardElements);
      if (data.sharedNotes) setSharedNotes(data.sharedNotes);
      if (data.polls) setPolls(data.polls);
      setIsLocked(!!data.isLocked);
      setIsE2EE(!!data.isE2EE);

      // Joiner initiates WebRTC offers to all existing peers in the room
      allPeers.forEach((peer) => {
        createPeerConnection(peer.id, true);
      });
    });

    // Socket Event: User Connected
    socket.on('user-connected', ({ user, participants: allParticipants }) => {
      const currentRemotePeers = allParticipants.filter(p => p.id !== socket.id);
      setParticipants(currentRemotePeers);

      // Existing peers wait for the new user's offer (isInitiator = false)
      createPeerConnection(user.id, false);
    });

    // Socket Event: User Disconnected
    socket.on('user-disconnected', ({ userId, participants: allParticipants }) => {
      setParticipants(allParticipants.filter(p => p.id !== socket.id));
      
      if (peerConnections.current.has(userId)) {
        peerConnections.current.get(userId).close();
        peerConnections.current.delete(userId);
      }
      
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Socket Event: WebRTC Signaling Relay (Offer / Answer / Candidate)
    socket.on('signal', async ({ senderId, signal }) => {
      let pc = peerConnections.current.get(senderId);
      if (!pc) {
        pc = createPeerConnection(senderId, false);
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          // Process queued ICE candidates
          if (iceCandidatesQueue.current.has(senderId)) {
            const queue = iceCandidatesQueue.current.get(senderId);
            for (const cand of queue) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            iceCandidatesQueue.current.delete(senderId);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('signal', {
            targetId: senderId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });

        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Process queued ICE candidates
          if (iceCandidatesQueue.current.has(senderId)) {
            const queue = iceCandidatesQueue.current.get(senderId);
            for (const cand of queue) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            iceCandidatesQueue.current.delete(senderId);
          }

        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Queue candidate until remote description is set
            if (!iceCandidatesQueue.current.has(senderId)) {
              iceCandidatesQueue.current.set(senderId, []);
            }
            iceCandidatesQueue.current.get(senderId).push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC Signal Process Error]:', err);
      }
    });

    // Auxiliary Real-Time Socket Events
    socket.on('media-state-changed', ({ participants: updatedParticipants }) => {
      setParticipants(updatedParticipants.filter(p => p.id !== socket.id));
    });

    socket.on('reaction-received', (reaction) => {
      setFloatingReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3500);
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
      socket.off('signal');
      socket.off('media-state-changed');
      socket.off('reaction-received');
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('room-lock-changed');
      socket.off('e2ee-changed');

      // Close all peer connections on unmount
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [socket, roomData, localStream]);

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

  // Screen Share Toggle with WebRTC Track Replacement
  const handleToggleScreen = async () => {
    if (screenOn) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      setScreenStream(null);
      setScreenOn(false);

      // Restore camera track to all active peer connections
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setScreenOn(true);

        const screenTrack = stream.getVideoTracks()[0];

        // Replace video track with screen track on all peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, stream);
          }
        });

        screenTrack.onended = () => {
          setScreenStream(null);
          setScreenOn(false);
          if (localStream) {
            const camTrack = localStream.getVideoTracks()[0];
            if (camTrack) {
              peerConnections.current.forEach((pc) => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(camTrack);
              });
            }
          }
        };
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  // Unmute Autoplay Unlocker
  const handleUnlockAudio = () => {
    setAudioBlocked(false);
    document.querySelectorAll('audio, video').forEach(media => {
      media.play().catch(() => {});
    });
  };

  const handleTogglePanel = (panelName) => {
    setActivePanel(prev => prev === panelName ? null : panelName);
  };

  const handleToggleHand = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (socket) {
      socket.emit('update-media-state', { handRaised: nextState });
    }
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleToggleE2EE = () => {
    const nextState = !isE2EE;
    setIsE2EE(nextState);
    if (socket) socket.emit('toggle-e2ee', nextState);
  };

  const handleToggleLock = () => {
    const nextState = !isLocked;
    setIsLocked(nextState);
    if (socket) socket.emit('toggle-room-lock', nextState);
  };

  return (
    <div className="meeting-workspace">
      {/* Autoplay Audio Unlock Warning Banner */}
      {audioBlocked && (
        <div 
          onClick={handleUnlockAudio}
          style={{
            background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
            color: 'white',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            zIndex: 100
          }}
        >
          <Volume2 size={16} /> Click anywhere to unmute & enable remote voice audio in your browser!
        </div>
      )}

      {/* Top Header Status Bar */}
      <header className="meeting-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0284c7' }}>HYSKOOL MEET</span>
          <span className="badge badge-purple">Room: {roomData.roomId}</span>
          {isE2EE && <span className="badge badge-cyan"><Shield size={12} /> E2EE Active</span>}
          {isLocked && <span className="badge badge-amber"><Lock size={12} /> Room Locked</span>}
        </div>

        {/* Video High Definition Quality Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <Sparkles size={14} color="#0284c7" />
            <select 
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              <option value="1080p" style={{ background: '#ffffff' }}>1080p Full HD</option>
              <option value="720p" style={{ background: '#ffffff' }}>720p HD</option>
              <option value="480p" style={{ background: '#ffffff' }}>480p Standard</option>
            </select>
          </div>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
            {participants.length + 1} Connected
          </span>
          {isRecording && (
            <span className="badge badge-rose" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Radio size={12} className="pulse" /> Recording
            </span>
          )}
        </div>
      </header>

      {/* Main Meeting Body (GMeet Adaptive Stage) */}
      <div className="meeting-body">
        {/* Real-time Video Grid Stage */}
        <VideoGrid 
          localStream={localStream}
          localUser={{
            name: roomData.userName,
            audioMuted: !micOn,
            videoMuted: !camOn,
            handRaised
          }}
          participants={participants}
          remoteStreams={remoteStreams}
          screenStream={screenStream}
          floatingReactions={floatingReactions}
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
        onSendReaction={handleSendReaction}
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
