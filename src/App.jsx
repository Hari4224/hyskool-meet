import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import LandingPage from './components/LandingPage';
import MeetingRoom from './components/MeetingRoom';
import IntegrationModal from './components/IntegrationModal';
import './styles/app.css';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  useEffect(() => {
    // Check URL parameters for direct join or embed mode
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const nameParam = urlParams.get('name') || 'Guest User';
    const roleParam = urlParams.get('role') || 'attendee';

    if (roomParam) {
      handleJoinRoom({
        roomId: roomParam,
        userName: nameParam,
        userRole: roleParam,
        enableE2EE: true
      });
    }

    // Connect socket
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleJoinRoom = (roomData) => {
    setCurrentRoom(roomData);
  };

  const handleLeaveMeeting = () => {
    setCurrentRoom(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div>
      {!currentRoom ? (
        <LandingPage 
          onJoinRoom={handleJoinRoom} 
          onOpenIntegrationModal={() => setShowIntegrationModal(true)}
        />
      ) : (
        <MeetingRoom 
          socket={socket} 
          roomData={currentRoom} 
          onLeaveMeeting={handleLeaveMeeting}
          onOpenIntegrationModal={() => setShowIntegrationModal(true)}
        />
      )}

      {showIntegrationModal && (
        <IntegrationModal 
          roomId={currentRoom?.roomId || 'math-class-101'}
          onClose={() => setShowIntegrationModal(false)}
        />
      )}
    </div>
  );
}
