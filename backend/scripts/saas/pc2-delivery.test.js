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

  const app = require('../../src/saas/app');
  const { sequelize } = require('../../src/models/db');
  const { createDelivery } = require('../../src/saas/delivery');

  const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'glowy-pc2-'));
  t.after(() => fs.rm(storage, { recursive: true, force: true }));

  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
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
    return { workspace: (await session.json()).workspace, outlets: await outlets.json() };
  }

  const aster = await signIn('aster-owner@example.test', 'PC2_ASTER_OWNER');
  const limited = await signIn('aster-outlet@example.test', 'PC2_ASTER_OUTLET');
  const birch = await signIn('birch-owner@example.test', 'PC2_BIRCH_OWNER');
  const [asterFirst, asterSecond] = aster.outlets;
  const [birchFirst] = birch.outlets;
  assert.deepEqual(limited.outlets.map(outlet => outlet.id), [asterFirst.id]);
  assert.notEqual(aster.workspace.id, birch.workspace.id);

  const asterMessages = [];
  const birchMessages = [];
  const providers = new Map([
    [aster.workspace.id, { send: message => asterMessages.push(message) }],
    [birch.workspace.id, { send: message => birchMessages.push(message) }],
  ]);
  const printed = [];
  const delivery = createDelivery({
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
