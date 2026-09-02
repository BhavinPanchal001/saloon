import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const getWhatsAppSocket = () => {
  if (!socket) {
    const socketUrl = getSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server.');
      socket.emit('whatsapp:request_status');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });
  }
  return socket;
};

/**
 * Subscribe to real-time WhatsApp events
 * @param {Object} handlers - { onStatus, onQR, onDisconnected }
 * @returns {Function} unsubscribe function
 */
export const subscribeToWhatsAppEvents = ({ onStatus, onQR, onDisconnected }) => {
  const s = getWhatsAppSocket();

  const statusListener = (status) => {
    if (onStatus) onStatus(status);
  };

  const qrListener = (data) => {
    if (onQR) onQR(data);
  };

  const disconnectedListener = (data) => {
    if (onDisconnected) onDisconnected(data);
  };

  s.on('whatsapp:status', statusListener);
  s.on('whatsapp:qr', qrListener);
  s.on('whatsapp:disconnected', disconnectedListener);

  // Request fresh status immediately
  s.emit('whatsapp:request_status');

  return () => {
    s.off('whatsapp:status', statusListener);
    s.off('whatsapp:qr', qrListener);
    s.off('whatsapp:disconnected', disconnectedListener);
  };
};

export const disconnectWhatsAppSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
