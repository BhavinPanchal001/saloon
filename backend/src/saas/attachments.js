const express = require('express');
const { authenticate, wrap } = require('./auth');
const { maxAttachmentBytes } = require('./delivery');

function createAttachmentRouter(delivery) {
  const router = express.Router();
  router.use(authenticate);

  const attachments = '/outlets/:outletId/attachments';
  router.post(attachments, express.raw({
    type: 'application/octet-stream',
    limit: maxAttachmentBytes,
    inflate: false,
  }), wrap(async (req, res) => {
    const id = await delivery.saveAttachment(req.saas.workspace, Number(req.params.outletId), req.body);
    res.status(201).json({ id });
  }));

  router.get(`${attachments}/:id`, wrap(async (req, res) => {
    const bytes = await delivery.readAttachment(
      req.saas.workspace, Number(req.params.outletId), req.params.id,
    );
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.attachment('attachment.bin').send(bytes);
  }));

  return router;
}

module.exports = { createAttachmentRouter };
