const { createCipheriv, createDecipheriv, randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function createMessagingSessions({ root, key, createProvider }) {
  if (!path.isAbsolute(root) || !Buffer.isBuffer(key) || key.length !== 32) {
    throw new TypeError('Messaging requires an absolute session root and a 32-byte encryption key.');
  }

  const organizations = new Map();

  function forOrganization(id) {
    if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('Invalid organization ID.');
    if (organizations.has(id)) return organizations.get(id);

    const directory = path.join(root, String(id));
    const file = path.join(directory, 'session');
    const associatedData = Buffer.from(String(id));
    let tail = Promise.resolve();
    let provider;

    function enqueue(operation) {
      const result = tail.then(operation);
      tail = result.catch(() => {});
      return result;
    }

    async function restore() {
      let data;
      try {
        data = await fs.readFile(file);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
      if (data.length < 28) throw new Error('Invalid encrypted messaging session.');
      const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAAD(associatedData);
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
    }

    async function persist(session) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(associatedData);
      const encrypted = Buffer.concat([cipher.update(session), cipher.final()]);
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const temporaryFile = path.join(directory, randomUUID());
      try {
        await fs.writeFile(temporaryFile, Buffer.concat([iv, cipher.getAuthTag(), encrypted]), {
          flag: 'wx',
          mode: 0o600,
        });
        await fs.rename(temporaryFile, file);
      } finally {
        await fs.rm(temporaryFile, { force: true });
      }
    }

    async function open() {
      if (!provider) provider = await createProvider({ organizationId: id, session: await restore() });
      return provider;
    }

    const session = {
      send: message => enqueue(async () => (await open()).send(message)),
      connect: () => enqueue(async () => {
        const connected = await open();
        const credentials = await connected.connect();
        if (credentials) await persist(credentials);
      }),
      disconnect: () => enqueue(async () => {
        if (!provider) return;
        await provider.disconnect();
        provider = undefined;
      }),
      reset: () => enqueue(async () => {
        if (provider) {
          await provider.disconnect();
          provider = undefined;
        }
        await fs.rm(file, { force: true });
      }),
    };
    organizations.set(id, session);
    return session;
  }

  return { forOrganization };
}

module.exports = { createMessagingSessions };
