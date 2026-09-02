const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {import('http').Server} server
 * @param {Object} options
 */
const initSocket = (server, options = {}) => {
  const allowedOrigin = options.corsOrigin || process.env.CORS_ORIGIN || 'http://localhost:5173';
  
  io = new Server(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    // Send current status on client connection
    try {
      const whatsappService = require('./whatsappService');
      const status = whatsappService.getStatus();
      socket.emit('whatsapp:status', status);
    } catch (_) {}

    socket.on('whatsapp:request_status', () => {
      try {
        const whatsappService = require('./whatsappService');
        const status = whatsappService.getStatus();
        socket.emit('whatsapp:status', status);
      } catch (_) {}
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  console.log('[Socket.IO] Real-time WebSocket server initialized.');
  return io;
};

/**
 * Get active Socket.IO instance
 */
const getIO = () => io;

/**
 * Broadcast event to all connected clients
 * @param {string} event
 * @param {any} data
 */
const emitWhatsAppEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitWhatsAppEvent,
};
