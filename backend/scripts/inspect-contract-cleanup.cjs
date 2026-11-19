const { sequelize, Contract, SalaryCalculation, LeaveRequest } = require('../src/models');
(async () => {
  const contracts = await Contract.findAll({ where: { code: ['CON-D495V', 'CON-2026-A8E16037197835C7'] } });
  const [columns] = await sequelize.query("SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME IN ('contract_id','previous_contract_id')");
  const [foreignKeys] = await sequelize.query("SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS child_schema, OBJECT_NAME(parent_object_id) AS child_table, COL_NAME(parent_object_id,parent_column_id) AS child_column FROM sys.foreign_key_columns WHERE referenced_object_id = OBJECT_ID('dbo.contracts')");
  const payroll = await SalaryCalculation.findAll({ where: { staff_id: contracts.map(c => c.employee_id) }, attributes: ['id', 'staff_id', 'month_key', 'status'] });
  const leaves = await LeaveRequest.findAll({ where: { contract_id: contracts.map(c => c.id) }, attributes: ['id', 'contract_id', 'start_date', 'end_date', 'status'] });
  const links = [];
  for (const col of columns) {
    const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM ${quote(col.TABLE_SCHEMA)}.${quote(col.TABLE_NAME)} WHERE ${quote(col.COLUMN_NAME)} = :id`, { replacements: { id: contracts.find(c => c.code === 'CON-D495V')?.id || -1 } });
    links.push({ ...col, count: rows[0].count });
  }
  console.log(JSON.stringify({ contracts: contracts.map(c => ({ id: c.id, code: c.code, employee_id: c.employee_id, start_date: c.start_date, end_date: c.end_date, previous_contract_id: c.previous_contract_id, hasDocument: Boolean(c.document_metadata) })), links, foreignKeys, payroll, leaves }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => sequelize.close());
