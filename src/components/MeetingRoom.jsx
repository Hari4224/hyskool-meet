import React, { useState, useEffect, useRef } from 'react';
import VideoGrid from './VideoGrid';
import ControlBar from './ControlBar';
import Whiteboard from './Whiteboard';
import ChatPanel from './ChatPanel';
import PollsModal from './PollsModal';
import SIPDialerModal from './SIPDialerModal';
import SharedNotes from './SharedNotes';
import IntegrationModal from './IntegrationModal';

import { Shield, Lock, Users, Radio, Sparkles, Volume2, Mic, Settings } from 'lucide-react';

// Enterprise-Grade ICE Servers (STUN & TURN Relays for NAT/Firewall Traversal)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.cloudflare.com:3478' },
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

  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);

  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);

  const [screenStream, setScreenStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // Map<socketId, MediaStream>

  const [whiteboardElements, setWhiteboardElements] = useState([]);
  const [sharedNotes, setSharedNotes] = useState('');
  const [polls, setPolls] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // Persistent Chat Messages & Unread Count State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-1',
      senderName: 'HYSKOOL System',
      text: 'Welcome to HYSKOOL MEET! Messaging is end-to-end encrypted and self-hosted.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    }
  ]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Persistent Chat Socket Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('chat-message', (msgData) => {
      setChatMessages(prev => [...prev, msgData]);
      setActivePanel(currentPanel => {
        if (currentPanel !== 'chat') {
          setUnreadChatCount(count => count + 1);
        }
        return currentPanel;
      });
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

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

  // Enumerate Microphone Input Devices for Laptop / PC users
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(inputs);
        if (inputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(inputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Enumerate devices warning:', err);
      }
    }
    getDevices();
  }, []);

  // 1. Initialize Local HD Media Stream ONCE on mount (Cross-Device Compatible for Windows, Android, iOS)
  useEffect(() => {
    let currentStream = null;
    let audioContext = null;
    let animId = null;

    async function initMedia() {
      try {
        const audioConstraint = selectedAudioDevice 
          ? { deviceId: { exact: selectedAudioDevice } }
          : { echoCancellation: { ideal: true }, autoGainControl: { ideal: true } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: audioConstraint
        });

        // Force enable all audio tracks
        stream.getAudioTracks().forEach(t => { t.enabled = true; });

        currentStream = stream;
        setLocalStream(stream);
        localStreamRef.current = stream;

        // Setup Web Audio Mic Volume Meter to verify microphone input on laptop
        if (stream.getAudioTracks().length > 0) {
          try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkVolume = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setMicVolumeLevel(Math.min(100, Math.round((average / 128) * 100)));
              animId = requestAnimationFrame(checkVolume);
            };
            checkVolume();
          } catch (e) {
            console.warn('AudioAnalyser warning:', e);
          }
        }

      } catch (err) {
        console.warn('HD camera fallback to standard constraints:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          fallbackStream.getAudioTracks().forEach(t => { t.enabled = true; });
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
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) audioContext.close().catch(() => {});
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedAudioDevice]);

  // 2. Dynamic Video Quality Constraint Adjuster
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

  // 3. WebRTC PeerConnection Lifecycle & Socket Signaling Engine (Cross-Platform Audio Transceivers)
  useEffect(() => {
    if (!socket) return;

    // Join Socket Room immediately on mount
    socket.emit('join-room', {
      roomId: roomData.roomId,
      userName: roomData.userName,
      userRole: roomData.userRole
    });

    // Helper: Create RTCPeerConnection for a target peer with clean single-transceiver SDP binding
    const createPeerConnection = (targetId, isInitiator) => {
      if (peerConnections.current.has(targetId)) {
        return peerConnections.current.get(targetId);
      }

      const MAX_PEERS = 120;
      if (peerConnections.current.size >= MAX_PEERS) {
        console.warn(`[Scale Limit Guard] Reached max WebRTC peer connections limit (${MAX_PEERS}).`);
        return null;
      }

      console.log(`[WebRTC Engine] Creating RTCPeerConnection for target: ${targetId} (Initiator: ${isInitiator})`);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(targetId, pc);

      const activeStream = localStreamRef.current || localStream;

      // Clean single transceiver binding per track (Fixes Windows Chrome & Android Chrome audio muting)
      if (activeStream && activeStream.getTracks().length > 0) {
        activeStream.getTracks().forEach((track) => {
          try {
            pc.addTransceiver(track, { direction: 'sendrecv', streams: [activeStream] });
          } catch (e) {
            pc.addTrack(track, activeStream);
          }
        });
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'sendrecv' });
          pc.addTransceiver('video', { direction: 'sendrecv' });
        } catch (e) {}
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

      // Handle Connection State Changes
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
            peerStream = event.streams[0] || new MediaStream();
          }

          if (!peerStream.getTracks().some(t => t.id === event.track.id)) {
            peerStream.addTrack(event.track);
          }

          updated.set(targetId, peerStream);
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
      if (data.chatHistory && data.chatHistory.length > 0) setChatMessages(data.chatHistory);
      if (data.whiteboardElements) setWhiteboardElements(data.whiteboardElements);
      if (data.sharedNotes) setSharedNotes(data.sharedNotes);
      if (data.polls) setPolls(data.polls);
      setIsLocked(!!data.isLocked);
      setIsE2EE(!!data.isE2EE);

      // Joiner initiates WebRTC offers to existing peers in room
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

    // Socket Event: WebRTC Signaling Relay
    socket.on('signal', async ({ senderId, signal }) => {
      let pc = peerConnections.current.get(senderId);
      if (!pc) {
        pc = createPeerConnection(senderId, false);
      }
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
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

    // Socket Event: Optimized Granular Media State Changes
    socket.on('media-state-changed', (data) => {
      if (data.participants) {
        setParticipants(data.participants.filter(p => p.id !== socket.id));
      } else if (data.userId) {
        setParticipants(prev => prev.map(p => {
          if (p.id === data.userId) {
            return {
              ...p,
              audioMuted: data.audioMuted !== undefined ? data.audioMuted : p.audioMuted,
              videoMuted: data.videoMuted !== undefined ? data.videoMuted : p.videoMuted,
              handRaised: data.handRaised !== undefined ? data.handRaised : p.handRaised
            };
          }
          return p;
        }));
      }
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

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [socket, roomData]);

  // 4. Sync local tracks to all active peer connections whenever localStream is acquired or updated
  useEffect(() => {
    if (!localStream) return;
    peerConnections.current.forEach((pc, targetId) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          try {
            pc.addTransceiver(track, { direction: 'sendrecv', streams: [localStream] });
          } catch (e) {
            pc.addTrack(track, localStream);
          }
          if (pc.signalingState === 'stable') {
            pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                socket.emit('signal', {
                  targetId,
                  signal: { type: 'offer', sdp: pc.localDescription }
                });
              })
              .catch(err => console.warn('Renegotiation offer error:', err));
          }
        }
      });
    });
  }, [localStream, socket]);

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

  const handleUnlockAudio = () => {
    setAudioBlocked(false);
    document.querySelectorAll('audio, video').forEach(media => {
      media.play().catch(() => {});
    });
  };

  const handleTogglePanel = (panelName) => {
    setActivePanel(prev => {
      const next = prev === panelName ? null : panelName;
      if (next === 'chat') setUnreadChatCount(0);
      return next;
    });
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
    <div className="meeting-workspace" style={{ position: 'relative' }}>
      {/* Root-Level Hidden Audio Elements Guarantee for All Remote Participants */}
      <div style={{ display: 'none' }}>
        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <audio
            key={peerId}
            ref={(audioEl) => {
              if (audioEl && stream) {
                if (audioEl.srcObject !== stream) {
                  audioEl.srcObject = stream;
                  audioEl.volume = 1.0;
                  audioEl.muted = false;
                  audioEl.play().catch(err => console.warn('Root audio playback warning:', err));
                }
              }
            }}
            autoPlay
          />
        ))}
      </div>

      {/* Global Floating Particle Reaction Emojis Overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        {floatingReactions.map((r, idx) => (
          <div 
            key={r.id}
            style={{
              position: 'absolute',
              bottom: '110px',
              left: `${20 + (idx % 5) * 15}%`,
              fontSize: '3rem',
              animation: 'floatUp 3.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))'
            }}
          >
            <span>{r.emoji}</span>
            <span style={{ fontSize: '0.75rem', color: '#0f172a', background: 'rgba(255,255,255,0.95)', padding: '3px 10px', borderRadius: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

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

        {/* Top Header Controls & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live Mic Volume Visualizer Meter for Laptop / PC Users */}
          {micOn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(5, 150, 105, 0.1)', padding: '4px 10px', borderRadius: 12, border: '1px solid rgba(5, 150, 105, 0.2)' }}>
              <Mic size={14} color="#059669" />
              <div style={{ width: 40, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${micVolumeLevel}%`, height: '100%', background: '#059669', transition: 'width 0.1s ease' }} />
              </div>
            </div>
          )}

          {/* Microphone Selector Dropdown for Laptop Users */}
          {audioDevices.length > 1 && (
            <select
              value={selectedAudioDevice}
              onChange={(e) => setSelectedAudioDevice(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                borderRadius: 8,
                border: '1px solid var(--glass-border)',
                background: 'white',
                fontWeight: 600,
                color: '#0f172a'
              }}
              title="Select Microphone Input"
            >
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.substring(0, 4)}`}
                </option>
              ))}
            </select>
          )}

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
            messages={chatMessages}
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
        unreadChatCount={unreadChatCount}
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
