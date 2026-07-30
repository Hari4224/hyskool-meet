import React, { useState, useRef } from 'react';
import { Mic, MicOff, Shield, Hand, ChevronLeft, ChevronRight, Users } from 'lucide-react';

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
      audioEl.muted = false;
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
          muted={true}
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
          controls={false}
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
  floatingReactions = [],
  screenStream, 
  isRecording, 
  isE2EE,
  videoQuality = '1080p'
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const touchStartX = useRef(0);
  const pageSize = 9; // Up to 9 active video tiles per page (fits 5 to 9 people on 1 screen)

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

  // Sort active speakers & hand raises first for 10+ user rooms
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.handRaised && !b.handRaised) return -1;
    if (!a.audioMuted && b.audioMuted) return -1;
    return 0;
  });

  const totalParticipantsCount = participants.length + 1;
  const totalPages = Math.ceil(totalParticipantsCount / pageSize);

  const isPageOne = currentPage === 1;
  const startIndex = isPageOne ? 0 : (currentPage - 1) * pageSize - 1;
  const endIndex = isPageOne ? pageSize - 1 : startIndex + pageSize;
  const visibleRemoteParticipants = sortedParticipants.slice(startIndex, endIndex);

  const displayCount = (isPageOne ? 1 : 0) + visibleRemoteParticipants.length;
  
  // Dynamic grid CSS layout selector
  const gridClass = displayCount === 1 ? 'count-1' 
    : displayCount === 2 ? 'count-2' 
    : (displayCount >= 3 && displayCount <= 4) ? 'count-4' 
    : (displayCount >= 5 && displayCount <= 6) ? 'count-6' 
    : (displayCount >= 7 && displayCount <= 9) ? 'count-9' 
    : 'count-many';

  // Touch Swipe Gesture Handlers (Left/Right swipe for mobile/tablet)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -50 && currentPage < totalPages) {
      // Swiped Left -> Next Page
      setCurrentPage(prev => prev + 1);
    } else if (deltaX > 50 && currentPage > 1) {
      // Swiped Right -> Previous Page
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div 
      className="gmeet-video-section" 
      style={{ flexDirection: 'column', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoom-Style Left Floating Side Slider Arrow */}
      {totalPages > 1 && currentPage > 1 && (
        <button 
          className="zoom-slider-arrow left"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          title="Previous Participant Page"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Zoom-Style Right Floating Side Slider Arrow */}
      {totalPages > 1 && currentPage < totalPages && (
        <button 
          className="zoom-slider-arrow right"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          title="Next Participant Page"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Screen Share Stage Spotlight if active */}
      {screenStream ? (
        <div style={{ display: 'flex', gap: 16, width: '100%', height: '100%' }}>
          <div className="gmeet-tile" style={{ flex: 3 }}>
            <video ref={screenVideoCallbackRef} autoPlay playsInline className="gmeet-video" style={{ objectFit: 'contain', background: '#000' }} />
            <div className="gmeet-name-pill">
              <span className="badge badge-cyan">Screen Presentation</span>
            </div>
          </div>

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
        <div className={`gmeet-grid ${gridClass}`} style={{ flex: 1 }}>
          {isPageOne && (
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
          )}

          {visibleRemoteParticipants.map((participant) => (
            <RemoteParticipantTile 
              key={participant.id} 
              participant={participant} 
              stream={remoteStreams.get(participant.id)} 
            />
          ))}
        </div>
      )}

      {/* Zoom-Style Carousel Page Slider Dots & Counter Bar (10+, 20+, 50+ users) */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          padding: '8px 22px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--glass-border)',
          marginTop: 12,
          zIndex: 10
        }}>
          {/* Zoom Carousel Dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: isActive ? 24 : 10,
                    height: 10,
                    borderRadius: 10,
                    background: isActive ? '#0284c7' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  title={`Go to Page ${pageNum}`}
                />
              );
            })}
          </div>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            <Users size={14} style={{ display: 'inline', marginRight: 6, color: '#0284c7' }} />
            Page {currentPage} of {totalPages} ({totalParticipantsCount} Connected)
          </span>
        </div>
      )}
    </div>
  );
}
