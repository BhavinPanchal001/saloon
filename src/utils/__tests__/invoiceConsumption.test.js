import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeInvoiceLine } from '../invoiceConsumption.js';
test('fractional invoice quantities scale service and package material totals', () => {
  const item = { qty: 2, productConsumption: [{ productId: 1, qty: 100, unit: 'secondary' }], includedServices: [{ serviceId: 5, productConsumption: [{ productId: 2, qty: 3 }] }] };
  const resized = resizeInvoiceLine(item, 0.5);
  assert.equal(resized.qty, 0.5);
  assert.equal(resized.productConsumption[0].qty, 25);
  assert.equal(resized.includedServices[0].productConsumption[0].qty, 0.75);
  assert.equal(item.productConsumption[0].qty, 100);
});
test('product unit metadata survives a quantity change', () => {
  assert.deepEqual(resizeInvoiceLine({ qty: 1, productConsumption: { unit: 'pack' } }, 0.5).productConsumption, { unit: 'pack' });
});

test('catalog selection distinguishes a product and service sharing the same database ID', async () => {
  const { catalogItemKey, findCatalogItem } = await import('../invoiceConsumption.js');
  const service = { id: 1, type: 'service', name: 'Haircut' };
  const product = { id: 1, type: 'product', name: 'Shampoo' };
  assert.equal(findCatalogItem([service, product], catalogItemKey(product)), product);
});
