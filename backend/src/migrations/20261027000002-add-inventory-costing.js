module.exports = {
  async up(q, S) {
    const add = async (table, name, definition) => {
      const cols = await q.describeTable(table);
      if (!cols[name]) await q.addColumn(table, name, definition);
    };
    await add('products', 'opening_unit_cost', { type: S.DECIMAL(18, 6), allowNull: true });
    await q.changeColumn('bill_line_items', 'qty', { type: S.DECIMAL(16, 4), allowNull: false, defaultValue: 1 });
    for (const [name, type] of Object.entries({ barcode: S.STRING(64), base_qty: S.DECIMAL(16, 4), cost_total: S.DECIMAL(16, 2), cost_allocations: S.JSON, stock_signature: S.TEXT })) {
      await add('bill_line_items', name, { type, allowNull: true });
    }
    await q.changeColumn('purchase_order_items', 'unit_price', { type: S.DECIMAL(18, 6), allowNull: false });
    await q.changeColumn('purchase_order_items', 'qty', { type: S.DECIMAL(16, 4), allowNull: false });
    for (const [name, type] of Object.entries({ barcode: S.STRING(64), entered_qty: S.DECIMAL(16, 4), entered_unit: S.STRING(20) })) {
      await add('purchase_order_items', name, { type, allowNull: true });
    }
    const tables = await q.showAllTables();
    const common = {
      id: { type: S.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: S.INTEGER.UNSIGNED, allowNull: false },
      location_id: { type: S.INTEGER.UNSIGNED, allowNull: false },
      unit_cost: { type: S.DECIMAL(18, 6), allowNull: true },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    };
    if (!tables.includes('inventory_lots')) {
      await q.createTable('inventory_lots', { ...common,
        source_key: { type: S.STRING(150), allowNull: false, unique: true },
        received_at: { type: S.DATE, allowNull: false },
        remaining_qty: { type: S.DECIMAL(16, 4), allowNull: false },
      });
      await q.addIndex('inventory_lots', ['product_id', 'location_id', 'received_at', 'id']);
    }
    if (!tables.includes('inventory_movements')) {
      await q.createTable('inventory_movements', { ...common,
        lot_id: { type: S.INTEGER.UNSIGNED, allowNull: true },
        quantity: { type: S.DECIMAL(16, 4), allowNull: false },
        reference: { type: S.STRING(150), allowNull: false },
      });
      await q.addIndex('inventory_movements', ['reference']);
    }
    await require('../services/openingLotMigration').seedOpeningLots(q.sequelize);
  },
  async down() {
    throw new Error('Cost history is retained. Restore a database backup to undo this migration.');
  },
};
