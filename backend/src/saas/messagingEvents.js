const { authenticate } = require('./auth');

function authenticateSocket(socket) {
  return new Promise((resolve, reject) => {
    const token = socket.handshake.auth?.token;
    const request = {
      get: name => name === 'authorization' && typeof token === 'string' ? `Bearer ${token}` : undefined,
    };
    const response = {
      status: () => ({
        json: () => reject(new Error('Messaging workspace access denied.')),
      }),
    };
    authenticate(request, response, error => {
      if (error) return reject(error);
      if (request.saas.workspace.role !== 'owner') {
        return reject(new Error('Messaging workspace access denied.'));
      }
      resolve(request.saas.workspace);
    });
  });
}

function createMessagingEvents(io) {
  const namespace = io.of('/saas-messaging');
  const room = id => `organization:${id}`;

  namespace.use(async (socket, next) => {
    try {
      const workspace = await authenticateSocket(socket);
      socket.data.organizationId = workspace.id;
      next();
    } catch {
      next(new Error('Messaging workspace access denied.'));
    }
  });

  namespace.on('connection', socket => {
    socket.join(room(socket.data.organizationId));
  });

  async function publish(organizationId, event, payload) {
    if (!Number.isSafeInteger(organizationId) || organizationId < 1 ||
        !['qr', 'status'].includes(event)) throw new TypeError('Invalid messaging event.');
    const sockets = await namespace.in(room(organizationId)).fetchSockets();
    await Promise.all(sockets.map(async remote => {
      const socket = namespace.sockets.get(remote.id);
      if (!socket) return;
      try {
        const workspace = await authenticateSocket(socket);
        if (workspace.id === organizationId) {
          socket.emit(event, payload);
          return;
        }
      } catch {
        // Membership may have changed since the socket connected.
      }
      socket.disconnect();
    }));
  }

  return { publish };
}

module.exports = { createMessagingEvents };
