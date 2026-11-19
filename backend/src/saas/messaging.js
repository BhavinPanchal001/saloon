const express = require('express');
const { authenticate, wrap } = require('./auth');

function createMessagingRouter(sessions) {
  const router = express.Router();
  router.use(authenticate, (req, res, next) => {
    if (req.saas.workspace.role !== 'owner') {
      return res.status(403).json({ message: 'Messaging workspace access denied.' });
    }
    return next();
  });

  for (const command of ['connect', 'disconnect', 'reset']) {
    router.post(`/${command}`, wrap(async (req, res) => {
      await sessions.forOrganization(req.saas.workspace.id)[command]();
      res.sendStatus(204);
    }));
  }
  return router;
}

module.exports = { createMessagingRouter };
