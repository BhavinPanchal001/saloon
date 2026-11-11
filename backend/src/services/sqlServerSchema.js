const { sequelize, Customer } = require('../models');

async function initializeSqlServer() {
  const qi = sequelize.getQueryInterface();
  const tables = new Set((await qi.showAllTables()).map(table => typeof table === 'string' ? table : table.tableName));
  const models = Object.values(sequelize.models);

  // Create all tables before foreign keys: bills and vouchers reference each other.
  for (const model of models) {
    const attributes = {};
    for (const [name, attribute] of Object.entries(model.rawAttributes)) {
      attributes[name] = { ...attribute };
      delete attributes[name].references;
      delete attributes[name].onDelete;
      delete attributes[name].onUpdate;
      // SQL Server needs filtered indexes to permit multiple NULL unique values.
      if (attribute.unique && attribute.allowNull !== false && !attribute.primaryKey) {
        delete attributes[name].unique;
      }
    }
    const table = model.getTableName();
    if (!tables.has(table)) {
      await qi.createTable(table, attributes);
    } else {
      const columns = await qi.describeTable(table);
      for (const [name, attribute] of Object.entries(attributes)) {
        const field = attribute.field || name;
        if (!columns[field]) await qi.addColumn(table, field, attribute);
      }
    }
  }

  for (const model of models) {
    const table = model.getTableName();
    const indexes = await qi.showIndex(table);
    for (const [name, attribute] of Object.entries(model.rawAttributes)) {
      const field = attribute.field || name;
      if (attribute.unique && attribute.allowNull !== false && !attribute.primaryKey) {
        const indexName = `${table}_${field}_unique_not_null`;
        if (!indexes.some(index => index.name === indexName)) {
          await qi.addIndex(table, [field], {
            name: indexName, unique: true,
            where: { [field]: { [require('sequelize').Op.ne]: null } },
          });
        }
      }
    }
    for (const index of model.options.indexes || []) {
      if (!indexes.some(existing => existing.name === index.name)) await qi.addIndex(table, index);
    }
    const foreignKeys = await qi.getForeignKeyReferencesForTable(table);
    for (const [name, attribute] of Object.entries(model.rawAttributes)) {
      if (!attribute.references) continue;
      const field = attribute.field || name;
      if (foreignKeys.some(key => key.columnName === field)) continue;
      // SQL Server rejects the multiple cascade paths in this association graph.
      // Restrict deletion rather than silently deleting related business records.
      await qi.addConstraint(table, {
        fields: [field], type: 'foreign key', name: `${table}_${field}_fk`,
        references: { table: attribute.references.model, field: attribute.references.key },
        onUpdate: 'NO ACTION', onDelete: 'NO ACTION',
      });
    }
  }

  await Customer.findOrCreate({
    where: { phone: '0000000000' },
    defaults: { name: 'Walk-in Guest', phone: '0000000000', email: 'walkin@glowy.local', gender: 'Female', credit_balance: 0 },
  });
  await require('./freezeContractTerms').freezeContractTerms();
  console.log('SQL Server tables and constraints are ready.');
}

module.exports = { initializeSqlServer };
