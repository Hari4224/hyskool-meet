import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Shield, Hand, Sparkles, Pin } from 'lucide-react';

export default function VideoGrid({ 
  localStream, 
  localUser, 
  participants = [], 
  screenStream, 
  isRecording, 
  isE2EE,
  videoQuality = '1080p'
}) {
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const totalCount = participants.length + 1;
  const gridClass = totalCount === 1 ? 'count-1' : totalCount === 2 ? 'count-2' : (totalCount === 3 || totalCount === 4) ? 'count-4' : 'count-many';

  return (
    <div className="gmeet-video-section">
      {/* Screen Share Stage Spotlight if active */}
      {screenStream ? (
        <div style={{ display: 'flex', gap: 16, width: '100%', height: '100%' }}>
          {/* Main Stage Screen Share */}
          <div className="gmeet-tile" style={{ flex: 3 }}>
            <video ref={screenVideoRef} autoPlay playsInline className="gmeet-video" style={{ objectFit: 'contain', background: '#000' }} />
            <div className="gmeet-name-pill">
              <span className="badge badge-cyan">Screen Presentation</span>
            </div>
          </div>

          {/* Right strip for participants */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            <div className="gmeet-tile" style={{ minHeight: '160px' }}>
              {localStream && !localUser?.videoMuted ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="gmeet-video" />
              ) : (
                <div className="avatar-placeholder-gmeet" style={{ width: 60, height: 60, fontSize: '1.2rem' }}>
                  {localUser?.name ? localUser.name.substring(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              <div className="gmeet-name-pill">
                {localUser?.audioMuted ? <MicOff size={14} color="#ea4335" /> : <Mic size={14} color="#34d399" />}
                <span>You</span>
              </div>
            </div>

            {participants.map(p => (
              <div key={p.id} className="gmeet-tile" style={{ minHeight: '160px' }}>
                <div className="avatar-placeholder-gmeet" style={{ width: 60, height: 60, fontSize: '1.2rem' }}>
                  {p.name ? p.name.substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="gmeet-name-pill">
                  {p.audioMuted ? <MicOff size={14} color="#ea4335" /> : <Mic size={14} color="#34d399" />}
                  <span>{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Google Meet Dynamic Full Screen Grid */
        <div className={`gmeet-grid ${gridClass}`}>
          {/* Local Participant Card */}
          <div className={`gmeet-tile ${!localUser?.audioMuted ? 'speaking' : ''}`}>
            {localStream && !localUser?.videoMuted ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="gmeet-video" />
            ) : (
              <div className="avatar-placeholder-gmeet">
                {localUser?.name ? localUser.name.substring(0, 2).toUpperCase() : 'ME'}
              </div>
            )}

            <div className="gmeet-name-pill">
              {localUser?.audioMuted ? <MicOff size={14} color="#ea4335" /> : <Mic size={14} color="#34d399" />}
              <span>{localUser?.name || 'You'} (You)</span>
              {localUser?.handRaised && <Hand size={14} color="#fbbc04" />}
              {isE2EE && <Shield size={12} color="#38bdf8" title="E2EE Encrypted" />}
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className={`gmeet-tile ${!participant.audioMuted ? 'speaking' : ''}`}
            >
              <div className="avatar-placeholder-gmeet">
                {participant.name ? participant.name.substring(0, 2).toUpperCase() : 'U'}
              </div>

              <div className="gmeet-name-pill">
                {participant.audioMuted ? <MicOff size={14} color="#ea4335" /> : <Mic size={14} color="#34d399" />}
                <span>{participant.name}</span>
                {participant.handRaised && <Hand size={14} color="#fbbc04" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
