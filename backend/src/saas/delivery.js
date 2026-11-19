const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { select } = require('./auth');

const attachmentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const maxAttachmentBytes = 5 * 1024 * 1024;

function unavailable() {
  return Object.assign(new Error('Delivery resource is unavailable.'), { status: 404 });
}

async function resolveOutlet(workspace, outletId) {
  if (!Number.isSafeInteger(outletId) || outletId < 1) throw unavailable();
  const [outlet] = await select(
    `SELECT id, organization_id, name, invoice_prefix FROM outlets
     WHERE id = ? AND organization_id = ? AND status = 'active'
       AND (? IS NULL OR id = ?)`,
    [outletId, workspace.id, workspace.outlet_id, workspace.outlet_id],
  );
  if (!outlet) throw unavailable();
  return outlet;
}

function createDelivery({ privateStorageRoot, messagingForOrganization, receiptPrinter }) {
  if (!path.isAbsolute(privateStorageRoot)) throw new TypeError('Set an absolute private storage root.');

  function outletDirectory(outlet) {
    return path.join(privateStorageRoot, String(outlet.organization_id), String(outlet.id));
  }

  return {
    async saveAttachment(workspace, outletId, bytes) {
      const outlet = await resolveOutlet(workspace, outletId);
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > maxAttachmentBytes) {
        throw Object.assign(new Error('Invalid attachment size.'), { status: 400 });
      }
      const id = randomUUID();
      const directory = outletDirectory(outlet);
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(directory, id), bytes, { flag: 'wx', mode: 0o600 });
      return id;
    },

    async readAttachment(workspace, outletId, id) {
      const outlet = await resolveOutlet(workspace, outletId);
      if (typeof id !== 'string' || !attachmentIdPattern.test(id)) throw unavailable();
      try {
        return await fs.readFile(path.join(outletDirectory(outlet), id));
      } catch (error) {
        if (error.code === 'ENOENT') throw unavailable();
        throw error;
      }
    },

    // The caller must resolve the recipient from an authorized business record.
    async sendMessage(workspace, outletId, { recipient, text }) {
      const outlet = await resolveOutlet(workspace, outletId);
      const provider = await messagingForOrganization(outlet.organization_id);
      return provider.send({ outletId: outlet.id, recipient, text });
    },

    // The caller must load the receipt under this outlet before dispatch.
    async printReceipt(workspace, outletId, receipt) {
      const outlet = await resolveOutlet(workspace, outletId);
      return receiptPrinter.print({
        organizationId: outlet.organization_id,
        outletId: outlet.id,
        outletName: outlet.name,
        invoicePrefix: outlet.invoice_prefix,
        receipt,
      });
    },
  };
}

module.exports = { createDelivery };
