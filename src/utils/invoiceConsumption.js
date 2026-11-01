export function resizeInvoiceLine(item, quantity) {
  const ratio = quantity / Number(item.qty || 1);
  const scale = (consumption) => (consumption || []).map((entry) => ({ ...entry, qty: Number((Number(entry.qty) * ratio).toFixed(4)) }));
  return { ...item, qty: quantity,
    productConsumption: Array.isArray(item.productConsumption) ? scale(item.productConsumption) : item.productConsumption,
    includedServices: item.includedServices?.map((service) => ({ ...service, productConsumption: scale(service.productConsumption) })),
  };
}

export const catalogItemKey = (item) => `${item.itemType || item.type}:${item.id}`;
export const findCatalogItem = (catalog, key) => catalog.find((item) => catalogItemKey(item) === key);
