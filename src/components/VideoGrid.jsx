import React, { useEffect } from 'react';
import { Mic, MicOff, Shield, Hand, Sparkles } from 'lucide-react';

function RemoteParticipantTile({ participant, stream }) {
  const videoCallbackRef = (videoEl) => {
    if (videoEl && stream && !participant.videoMuted) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(err => console.warn('Remote video playback notice:', err));
    }
  };

  const audioCallbackRef = (audioEl) => {
    if (audioEl && stream) {
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }
      audioEl.volume = 1.0;
      audioEl.play().catch(err => console.warn('Remote audio playback notice:', err));
    }
  };

  return (
    <div className={`gmeet-tile ${!participant.audioMuted ? 'speaking' : ''}`}>
      {stream && !participant.videoMuted ? (
        <video 
          ref={videoCallbackRef} 
          autoPlay 
          playsInline 
          className="gmeet-video"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div className="avatar-placeholder-gmeet">
          {participant.name ? participant.name.substring(0, 2).toUpperCase() : 'U'}
        </div>
      )}

      {/* Dedicated audio element for remote participant voice audio stream */}
      {stream && (
        <audio 
          ref={audioCallbackRef}
          autoPlay 
        />
      )}

      <div className="gmeet-name-pill">
        {participant.audioMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#059669" />}
        <span>{participant.name}</span>
        {participant.handRaised && <Hand size={14} color="#f59e0b" />}
      </div>
    </div>
  );
}

export default function VideoGrid({ 
  localStream, 
  localUser, 
  participants = [], 
  remoteStreams = new Map(),
  screenStream, 
  isRecording, 
  isE2EE,
  videoQuality = '1080p'
}) {
  const localVideoCallbackRef = (videoEl) => {
    if (videoEl && localStream && !localUser?.videoMuted) {
      if (videoEl.srcObject !== localStream) {
        videoEl.srcObject = localStream;
      }
      videoEl.play().catch(() => {});
    }
  };

  const screenVideoCallbackRef = (videoEl) => {
    if (videoEl && screenStream) {
      if (videoEl.srcObject !== screenStream) {
        videoEl.srcObject = screenStream;
      }
      videoEl.play().catch(() => {});
    }
  };

  const totalCount = participants.length + 1;
  const gridClass = totalCount === 1 ? 'count-1' : totalCount === 2 ? 'count-2' : (totalCount === 3 || totalCount === 4) ? 'count-4' : 'count-many';

  return (
    <div className="gmeet-video-section">
      {/* Screen Share Stage Spotlight if active */}
      {screenStream ? (
        <div style={{ display: 'flex', gap: 16, width: '100%', height: '100%' }}>
          {/* Main Stage Screen Share */}
          <div className="gmeet-tile" style={{ flex: 3 }}>
            <video ref={screenVideoCallbackRef} autoPlay playsInline className="gmeet-video" style={{ objectFit: 'contain', background: '#000' }} />
            <div className="gmeet-name-pill">
              <span className="badge badge-cyan">Screen Presentation</span>
            </div>
          </div>

          {/* Right strip for participants */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            <div className="gmeet-tile" style={{ minHeight: '160px' }}>
              {localStream && !localUser?.videoMuted ? (
                <video ref={localVideoCallbackRef} autoPlay muted playsInline className="gmeet-video" />
              ) : (
                <div className="avatar-placeholder-gmeet" style={{ width: 60, height: 60, fontSize: '1.2rem' }}>
                  {localUser?.name ? localUser.name.substring(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              <div className="gmeet-name-pill">
                {localUser?.audioMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#059669" />}
                <span>You</span>
              </div>
            </div>

            {participants.map(p => (
              <RemoteParticipantTile 
                key={p.id} 
                participant={p} 
                stream={remoteStreams.get(p.id)} 
              />
            ))}
          </div>
        </div>
      ) : (
        /* Standard Google Meet Dynamic Full Screen Grid */
        <div className={`gmeet-grid ${gridClass}`}>
          {/* Local Participant Card */}
          <div className={`gmeet-tile ${!localUser?.audioMuted ? 'speaking' : ''}`}>
            {localStream && !localUser?.videoMuted ? (
              <video ref={localVideoCallbackRef} autoPlay muted playsInline className="gmeet-video" />
            ) : (
              <div className="avatar-placeholder-gmeet">
                {localUser?.name ? localUser.name.substring(0, 2).toUpperCase() : 'ME'}
              </div>
            )}

            <div className="gmeet-name-pill">
              {localUser?.audioMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#059669" />}
              <span>{localUser?.name || 'You'} (You)</span>
              {localUser?.handRaised && <Hand size={14} color="#f59e0b" />}
              {isE2EE && <Shield size={12} color="#0284c7" title="E2EE Encrypted" />}
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((participant) => (
            <RemoteParticipantTile 
              key={participant.id} 
              participant={participant} 
              stream={remoteStreams.get(participant.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
