const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { verifiedConnection } = require('./connection');

test('PC 2 delivery isolates two salons and an outlet-restricted account', async (t) => {
  const expectedServer = process.env.PC2_EXPECTED_SERVER;
  if (process.env.NODE_ENV !== 'test') throw new Error('Use the dedicated PC 2 test environment.');
  const verified = await verifiedConnection(expectedServer, 'glowy_pc2_test');
  await verified.end();

  const app = require('express')();
  const { createAttachmentRouter } = require('../../src/saas/attachments');
  const { sequelize } = require('../../src/models/db');
  const { createDelivery } = require('../../src/saas/delivery');

  const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'glowy-pc2-'));
  t.after(() => fs.rm(storage, { recursive: true, force: true }));

  let delivery;
  const commands = [];
  const { createMessagingRouter } = require('../../src/saas/messaging');
  app.use('/api/messaging', createMessagingRouter({
    forOrganization: organizationId => ({
      reset: async () => commands.push(['reset', organizationId]),
    }),
  }));
  app.use('/api/delivery', createAttachmentRouter({
    saveAttachment: (...args) => delivery.saveAttachment(...args),
    readAttachment: (...args) => delivery.readAttachment(...args),
  }));
  app.use(require('../../src/saas/app'));
  app.use((error, _req, res, _next) => res.sendStatus(error.status || 500));

  const server = app.listen(0, '127.0.0.1');
  const { Server } = require('socket.io');
  const { io: connectSocket } = require('../../../node_modules/socket.io-client');
  const { createMessagingEvents } = require('../../src/saas/messagingEvents');
  const io = new Server(server);
  const events = createMessagingEvents(io);
  const clients = [];
  t.after(async () => {
    for (const socket of clients) socket.close();
    await io.close();
    await sequelize.close();
  });
  await once(server, 'listening');
  const api = `http://127.0.0.1:${server.address().port}`;

  async function signIn(email, passwordKey) {
    const signInResponse = await fetch(`${api}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: process.env[passwordKey] }),
    });
    assert.equal(signInResponse.status, 200);
    const { token } = await signInResponse.json();
    const headers = { Authorization: `Bearer ${token}` };
    const [session, outlets] = await Promise.all([
      fetch(`${api}/api/auth/me`, { headers }),
      fetch(`${api}/api/outlets`, { headers }),
    ]);
    assert.equal(session.status, 200);
    assert.equal(outlets.status, 200);
    return { token, headers, workspace: (await session.json()).workspace, outlets: await outlets.json() };
  }

  const aster = await signIn('aster-owner@example.test', 'PC2_ASTER_OWNER');
  const limited = await signIn('aster-outlet@example.test', 'PC2_ASTER_OUTLET');
  const birch = await signIn('birch-owner@example.test', 'PC2_BIRCH_OWNER');
  const [asterFirst, asterSecond] = aster.outlets;
  const [birchFirst] = birch.outlets;
  assert.deepEqual(limited.outlets.map(outlet => outlet.id), [asterFirst.id]);
  assert.notEqual(aster.workspace.id, birch.workspace.id);

  function socketFor(token) {
    const client = connectSocket(`${api}/saas-messaging`, { auth: { token }, autoConnect: false, reconnection: false });
    clients.push(client);
    return client;
  }

  const asterSocket = socketFor(aster.token);
  const birchSocket = socketFor(birch.token);
  const restrictedSocket = socketFor(limited.token);
  const asterConnected = once(asterSocket, 'connect');
  const birchConnected = once(birchSocket, 'connect');
  const restrictedDenied = once(restrictedSocket, 'connect_error');
  for (const client of clients) client.connect();
  await Promise.all([asterConnected, birchConnected]);
  assert.match((await restrictedDenied)[0].message, /access denied/);

  const leaked = [];
  birchSocket.on('qr', qr => leaked.push(qr));
  const asterQr = once(asterSocket, 'qr');
  const birchStatus = once(birchSocket, 'status');
  await events.publish(aster.workspace.id, 'qr', 'synthetic Aster QR');
  await events.publish(birch.workspace.id, 'status', 'ready');
  assert.deepEqual(await asterQr, ['synthetic Aster QR']);
  assert.deepEqual(await birchStatus, ['ready']);
  assert.deepEqual(leaked, []);

  const resetUrl = `${api}/api/messaging/reset`;
  const [ownerReset, memberReset] = await Promise.all([
    fetch(resetUrl, { method: 'POST', headers: aster.headers }),
    fetch(resetUrl, { method: 'POST', headers: limited.headers }),
  ]);
  assert.equal(ownerReset.status, 204);
  assert.equal(memberReset.status, 403);
  assert.deepEqual(commands, [['reset', aster.workspace.id]]);

  const asterMessages = [];
  const birchMessages = [];
  const providers = new Map([
    [aster.workspace.id, { send: message => asterMessages.push(message) }],
    [birch.workspace.id, { send: message => birchMessages.push(message) }],
  ]);
  const printed = [];
  delivery = createDelivery({
    privateStorageRoot: storage,
    messagingForOrganization: id => providers.get(id),
    receiptPrinter: {
      print(job) {
        if (job.outletId === asterSecond.id) throw new Error('Mock printer offline');
        printed.push(job);
      },
    },
  });

  const attachmentA = Buffer.from('Synthetic purchase order PO-001 for Aster');
  const attachmentB = Buffer.from('Synthetic purchase order PO-001 for Birch');
  const asterId = await delivery.saveAttachment(limited.workspace, asterFirst.id, attachmentA);
  const birchId = await delivery.saveAttachment(birch.workspace, birchFirst.id, attachmentB);
  await assert.rejects(delivery.saveAttachment(limited.workspace, asterSecond.id, attachmentA), { status: 404 });
  await assert.rejects(delivery.saveAttachment(aster.workspace, birchFirst.id, attachmentA), { status: 404 });
  await assert.rejects(delivery.readAttachment(birch.workspace, asterFirst.id, asterId), { status: 404 });
  await assert.rejects(delivery.readAttachment(birch.workspace, birchFirst.id, asterId), { status: 404 });
  await assert.rejects(delivery.readAttachment(aster.workspace, asterFirst.id, '../PO-001'), { status: 404 });
  assert.deepEqual(await delivery.readAttachment(aster.workspace, asterFirst.id, asterId), attachmentA);
  assert.deepEqual(await delivery.readAttachment(birch.workspace, birchFirst.id, birchId), attachmentB);
  assert.deepEqual(await fs.readdir(path.join(storage, String(aster.workspace.id))), [String(asterFirst.id)]);
  assert.deepEqual(await fs.readdir(path.join(storage, String(birch.workspace.id), String(birchFirst.id))), [birchId]);
  assert.equal((await fetch(`${api}/uploads/${asterId}`)).status, 404);

  const attachmentEndpoint = `${api}/api/delivery/outlets/${asterFirst.id}/attachments`;
  const upload = await fetch(attachmentEndpoint, {
    method: 'POST',
    headers: { ...limited.headers, 'Content-Type': 'application/octet-stream' },
    body: attachmentA,
  });
  assert.equal(upload.status, 201);
  const downloadUrl = `${attachmentEndpoint}/${(await upload.json()).id}`;
  const download = await fetch(downloadUrl, { headers: limited.headers });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), attachmentA);
  assert.equal((await fetch(downloadUrl, { headers: birch.headers })).status, 404);
  assert.equal((await fetch(downloadUrl)).status, 401);

  const message = { recipient: '+12025550123', text: 'Synthetic receipt R-001' };
  const receipt = { number: 'R-001', totalInCents: 2400 };
  await Promise.all([
    delivery.sendMessage(limited.workspace, asterFirst.id, message),
    delivery.sendMessage(birch.workspace, birchFirst.id, message),
    delivery.printReceipt(limited.workspace, asterFirst.id, receipt),
    delivery.printReceipt(birch.workspace, birchFirst.id, receipt),
  ]);
  await assert.rejects(delivery.sendMessage(birch.workspace, asterFirst.id, message), { status: 404 });
  await assert.rejects(delivery.printReceipt(aster.workspace, birchFirst.id, receipt), { status: 404 });
  await assert.rejects(delivery.printReceipt(aster.workspace, asterSecond.id, receipt), /Mock printer offline/);
  assert.deepEqual(asterMessages, [{ outletId: asterFirst.id, ...message }]);
  assert.deepEqual(birchMessages, [{ outletId: birchFirst.id, ...message }]);
  assert.deepEqual(printed.map(job => job.outletName).sort(), [asterFirst.name, birchFirst.name].sort());
});

test('encrypted messaging sessions survive restart and reset independently', async (t) => {
  const { randomBytes } = require('node:crypto');
  const { createMessagingSessions } = require('../../src/saas/messagingSessions');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'glowy-pc2-messaging-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const restored = [];
  const sent = [];
  const options = {
    root,
    key: randomBytes(32),
    createProvider({ organizationId, session }) {
      restored.push([organizationId, session?.toString() ?? null]);
      return {
        connect: async () => Buffer.from(`synthetic credentials ${organizationId}`),
        disconnect: async () => {},
        send: async message => sent.push([organizationId, message]),
      };
    },
  };
  const original = createMessagingSessions(options);
  await Promise.all([original.forOrganization(1).connect(), original.forOrganization(2).connect()]);
  const encrypted = await fs.readFile(path.join(root, '2', 'session'));
  assert.equal(encrypted.includes('synthetic credentials'), false);

  const restarted = createMessagingSessions(options);
  await Promise.all([
    restarted.forOrganization(1).reset(),
    restarted.forOrganization(2).send('synthetic receipt'),
  ]);
  await restarted.forOrganization(1).connect();
  assert.deepEqual(restored.slice(2), [[2, 'synthetic credentials 2'], [1, null]]);
  assert.deepEqual(sent, [[2, 'synthetic receipt']]);
  assert.deepEqual(await fs.readFile(path.join(root, '2', 'session')), encrypted);
});
