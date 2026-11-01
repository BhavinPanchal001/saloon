const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { sequelize, Product, UnitMaster, InventoryLot, Admin, Outlet, OutletInventory, Service, Package, PackageService, BillLineItem } = require('../src/models');
process.env.THERMAL_PRINTER_ENABLED = 'false';
process.env.WHATSAPP_ENABLED = 'false';
let server, baseUrl, token, unit;
before(async () => {
  // HTTP writes commit; require the disposable schema runner to protect business data.
  assert.match(sequelize.config.database, /^glowy_audit_\d+_[0-9a-f]{8}$/, 'Run with npm run test:inventory.');
  unit = await UnitMaster.create({ group_name: 'Product test volume', primary_unit: 'Litre',
    primary_abbr: 'L', secondary_unit: 'Millilitre', secondary_abbr: 'ML', conversion_ratio: 1000 });
  const admin = await Admin.create({ name: 'Product regression admin', email: 'product-regression@example.invalid', password: 'unused-test-fixture', role: 'super_admin' });
  token = jwt.sign({ id: admin.id, role: 'super_admin', userType: 'admin' }, process.env.JWT_SECRET);
  const app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/products`;
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await sequelize.close();
});
async function request(method, suffix = '', body) {
  const response = await fetch(baseUrl + suffix, { method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
async function create(overrides = {}) {
  const response = await request('POST', '', { item_name: 'Test shampoo', unit_price: '45.50', ...overrides });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data;
}
test('product API accepts decimal prices and trims names on create and edit', async () => {
  const product = await create({ item_name: '  Shampoo  ' });
  assert.equal(product.item_name, 'Shampoo');
  assert.equal(Number(product.unit_price), 45.5);
  const edited = await request('PUT', `/${product.id}`, { item_name: '  Conditioner  ', unit_price: '39.95' });
  assert.equal(edited.status, 200);
  const saved = await Product.findByPk(product.id);
  assert.equal(saved.item_name, 'Conditioner');
  assert.equal(Number(saved.unit_price), 39.95);
});
test('blank or non-string names are rejected without saving changes', async () => {
  const product = await create();
  for (const name of ['', '   ', null, 123]) {
    assert.equal((await request('POST', '', { item_name: name, unit_price: 1 })).status, 400);
    assert.equal((await request('PUT', `/${product.id}`, { item_name: name })).status, 400);
  }
  assert.equal((await Product.findByPk(product.id)).item_name, 'Test shampoo');
});
test('empty and malformed selling prices cannot make products free or change stock', async () => {
  const product = await create();
  for (const value of [null, '', '   ', false, 'not-a-price', -1]) {
    const response = await request('PUT', `/${product.id}`, { unit_price: value, opening_stock: 3 });
    assert.equal(response.status, 400, JSON.stringify({ value, response }));
    const saved = await Product.findByPk(product.id);
    assert.equal(Number(saved.unit_price), 45.5);
    assert.equal(Number(saved.central_stock), 0);
    assert.equal(await InventoryLot.count({ where: { product_id: product.id } }), 0);
  }
  assert.equal((await request('PUT', `/${product.id}`, { unit_price: 0 })).status, 200, 'Explicit zero is valid');
});
test('invalid unit groups return client errors on create and edit', async () => {
  const product = await create();
  for (const value of [99999999, 'not-a-unit', -1, 1.5, true]) {
    const added = await request('POST', '', { item_name: 'Bad unit', unit_price: 1, unit_master_id: value });
    assert.equal(added.status, 400);
    assert.match(added.data.message, /unit group/i);
    assert.equal((await request('PUT', `/${product.id}`, { unit_master_id: value, opening_stock: 3 })).status, 400);
    const saved = await Product.findByPk(product.id);
    assert.equal(saved.unit_master_id, null);
    assert.equal(Number(saved.central_stock), 0);
  }
  const valid = await request('PUT', `/${product.id}`, { unit_master_id: String(unit.id) });
  assert.equal(valid.status, 200);
  assert.equal(valid.data.unit_master_id, unit.id);
});
test('archive hides active products while retaining stock and history access', async () => {
  const product = await create({ opening_stock: 2, opening_unit_cost: 10, unit_master_id: unit.id });
  assert.equal((await request('DELETE', `/${product.id}`)).status, 200);
  assert.equal((await request('GET', '?status=active')).data.some(item => item.id === product.id), false);
  assert.equal((await request('GET', '?status=inactive')).data.some(item => item.id === product.id), true);
  const detail = await request('GET', `/${product.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.status, 'inactive');
  assert.equal(Number(detail.data.central_stock), 2);
  assert.equal(await InventoryLot.count({ where: { product_id: product.id } }), 1);
});
test('missing product reads, updates and archives return 404', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const response = await request(method, '/99999999', method === 'PUT' ? { unit_price: 1 } : undefined);
    assert.equal(response.status, 404);
    assert.equal(response.data.message, 'Product not found.');
  }
});

async function api(method, path, body) {
  const response = await fetch(baseUrl.replace(/\/products$/, '') + path, { method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}

test('product edits preserve purchase, issue, mixed POS consumption, invoice snapshots and archive history', async () => {
  const outlet = await Outlet.findOne();
  const product = await create({ item_name: 'Cross-flow shampoo', opening_stock: 2, opening_unit_cost: 10,
    unit_master_id: unit.id, product_measure: 500, product_measure_unit: 'secondary', consumption_unit: 'secondary' });
  const purchase = await api('POST', '/purchase-orders', { supplierName: 'Regression supplier',
    items: [{ productId: product.id, qty: 2000, unit: 'secondary', unitPrice: 0.015 }] });
  assert.equal(purchase.status, 201, JSON.stringify(purchase.data));
  assert.equal(Number((await Product.findByPk(product.id)).central_stock), 4);
  const issued = await api('POST', '/outlet-inventory/issue', { outletId: outlet.id, productId: product.id, qty: 3, sellingPrice: 49.95 });
  assert.equal(issued.status, 201, JSON.stringify(issued.data));
  assert.equal(Number((await Product.findByPk(product.id)).central_stock), 1);
  const service = await Service.create({ service_name: 'Regression treatment', price: 20,
    product_linkages: [{ inventoryId: String(product.id), quantityUsed: 250, consumptionUnit: 'secondary' }] });
  const pack = await Package.create({ package_code: `REG-${product.id}`, package_name: 'Regression package', price: 30 });
  await PackageService.create({ package_id: pack.id, service_id: service.id, sessions: 1 });
  const catalog = await api('GET', `/pos/catalog?outletId=${outlet.id}`);
  assert.equal(catalog.status, 200);
  const card = catalog.data.find(item => item.type === 'product' && item.id === product.id);
  assert.equal(card.price, 49.95);
  assert.equal(card.stock, 3);
  assert.equal(card.unitMaster.conversionRatio, 1000);
  assert.ok(catalog.data.some(item => item.type === 'service' && item.id === service.id));
  assert.ok(catalog.data.some(item => item.type === 'package' && item.id === pack.id));
  const consumption = [{ productId: product.id, qty: 250, unit: 'secondary' }];
  const lines = [
    { itemId: product.id, itemType: 'product', itemName: product.item_name, qty: 1, price: 49.95, unit: 'pack' },
    { itemId: service.id, itemType: 'service', itemName: service.service_name, qty: 1, price: 20, productConsumption: consumption },
    { itemId: pack.id, itemType: 'package', itemName: pack.package_name, qty: 1, price: 30,
      includedServices: [{ serviceId: service.id, serviceName: service.service_name, productConsumption: consumption }] },
  ];
  const checkout = await api('POST', '/pos/checkout', { outletId: outlet.id, paymentMethod: 'Cash',
    lineItems: lines, paymentDetails: [{ paymentMode: 'cash', amount: 99.95 }], tax: 0, sendWhatsApp: false });
  assert.equal(checkout.status, 201, JSON.stringify(checkout.data));
  const stock = () => OutletInventory.findOne({ where: { outlet_id: outlet.id, product_id: product.id } });
  assert.equal(Number((await stock()).current_stock), 2);
  const savedLines = await BillLineItem.findAll({ where: { bill_id: checkout.data.id }, order: [['id', 'ASC']] });
  assert.deepEqual(savedLines.map(line => Number(line.cost_total)), [5, 2.5, 2.5]);
  const edit = await request('PUT', `/${product.id}`, { item_name: 'Renamed shampoo', unit_price: '39.95', unit_master_id: String(unit.id), opening_stock: 2 });
  assert.equal(edit.status, 200, JSON.stringify(edit.data));
  assert.equal(Number(edit.data.central_stock), 1, 'Saving unchanged opening stock must not duplicate stock');
  assert.equal(Number((await stock()).current_stock), 2);
  const detail = await api('GET', `/pos/bills/${checkout.data.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.lineItems.find(item => item.itemType === 'product').price, 49.95);
  const billEdit = await api('PUT', `/pos/bills/${checkout.data.id}`, { lineItems: lines.map((line, index) => ({ ...line,
    billLineId: savedLines[index].id, qty: index === 0 ? 2 : 1 })) });
  assert.equal(billEdit.status, 200, JSON.stringify(billEdit.data));
  assert.equal(Number((await stock()).current_stock), 1.5);
  const editedLine = await BillLineItem.findOne({ where: { bill_id: checkout.data.id, item_type: 'product' } });
  assert.equal(Number(editedLine.cost_total), 10);
  assert.equal(editedLine.barcode, product.barcode);
  const report = await api('GET', `/reports/profit-loss?outletId=${outlet.id}`);
  assert.equal(report.status, 200, JSON.stringify(report.data));
  const reportedSale = report.data.productSales.find(sale => sale.lineId === editedLine.id);
  assert.ok(reportedSale);
  assert.equal(Number(reportedSale.costTotal), 10);
  assert.equal((await request('DELETE', `/${product.id}`)).status, 200);
  const archivedCatalog = await api('GET', `/pos/catalog?outletId=${outlet.id}`);
  assert.equal(archivedCatalog.data.some(item => item.type === 'product' && item.id === product.id), false);
  assert.ok((await request('GET')).data.some(item => item.id === product.id), 'Unfiltered lookup retains archived products');
  const oldPurchase = await api('GET', `/purchase-orders/${purchase.data.id}`);
  assert.equal(oldPurchase.status, 200);
  assert.equal(oldPurchase.data.items[0].productId, product.id);
  assert.equal(oldPurchase.data.items[0].productName, product.item_name);
  assert.equal(oldPurchase.data.items[0].barcode, product.barcode);
  assert.equal((await api('GET', `/pos/bills/${checkout.data.id}`)).status, 200);
  assert.equal((await api('GET', `/services/${service.id}`)).status, 200);
  assert.equal((await api('GET', `/packages/${pack.id}`)).status, 200);
});

test('partial edits and products without a unit group keep existing optional fields', async () => {
  const product = await create({ images: ['data:image/png;base64,QA'], unit_master_id: null });
  const edited = await request('PUT', `/${product.id}`, { unit_price: '15.75' });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.unit_master_id, null);
  assert.equal(edited.data.item_name, product.item_name);
  assert.equal(edited.data.barcode, product.barcode);
  assert.deepEqual(edited.data.images, product.images);
  assert.equal(Number(edited.data.central_stock), 0);
});

test('existing inactive unit groups do not block saving valid products', async () => {
  const oldUnit = await UnitMaster.create({ group_name: 'Legacy group', primary_unit: 'Piece', primary_abbr: 'PC',
    secondary_unit: 'Piece', secondary_abbr: 'PC', conversion_ratio: 1, status: 'inactive' });
  const product = await create({ unit_master_id: oldUnit.id, opening_stock: 2 });
  const edited = await request('PUT', `/${product.id}`, { unit_master_id: String(oldUnit.id), unit_price: '12.25' });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.unit_master_id, oldUnit.id);
  assert.equal(Number(edited.data.central_stock), 2);
});
