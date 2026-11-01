// Safe to retry after an interrupted deployment: never seed a balance already represented by lots.
async function seedOpeningLots(sequelize, transaction) {
  await sequelize.query(`INSERT IGNORE INTO inventory_lots
    (product_id, location_id, source_key, received_at, remaining_qty, unit_cost, created_at, updated_at)
    SELECT p.id, 0, CONCAT('opening:', p.id, ':0'), NOW(), p.central_stock, p.opening_unit_cost, NOW(), NOW()
    FROM products p WHERE p.central_stock <> 0
    AND NOT EXISTS (SELECT 1 FROM inventory_lots l WHERE l.product_id = p.id AND l.location_id = 0)`, { transaction });
  await sequelize.query(`INSERT IGNORE INTO inventory_lots
    (product_id, location_id, source_key, received_at, remaining_qty, unit_cost, created_at, updated_at)
    SELECT i.product_id, i.outlet_id, CONCAT('opening:', i.product_id, ':', i.outlet_id), NOW(), SUM(i.current_stock), NULL, NOW(), NOW()
    FROM outlet_inventories i WHERE NOT EXISTS
      (SELECT 1 FROM inventory_lots l WHERE l.product_id = i.product_id AND l.location_id = i.outlet_id)
    GROUP BY i.product_id, i.outlet_id HAVING SUM(i.current_stock) <> 0`, { transaction });
}
module.exports = { seedOpeningLots };
