const { verifiedConnection } = require('./connection');

async function baseline(connection) {
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  try {
    const [tables] = await connection.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY BINARY table_name"
    );
    const counts = {};
    for (const { name } of tables) {
      const [[row]] = await connection.query('SELECT COUNT(*) AS n FROM ??', [name]);
      counts[name] = row.n;
    }
    const summaries = {
      migrations: 'SELECT name FROM SequelizeMeta ORDER BY name',
      bills: 'SELECT outlet_id, status, COUNT(*) n, SUM(total) amount FROM bills GROUP BY outlet_id, status ORDER BY outlet_id, status',
      payments: 'SELECT b.outlet_id, p.status, SUM(p.total_amount) amount FROM payments p LEFT JOIN bills b ON b.id=p.bill_id GROUP BY b.outlet_id,p.status ORDER BY b.outlet_id,p.status',
      customerCredit: 'SELECT id, credit_balance FROM customers WHERE credit_balance <> 0 ORDER BY id',
      settlementLedger: 'SELECT type, COUNT(*) n, SUM(amount) amount FROM customer_ledgers GROUP BY type ORDER BY type',
      inventory: 'SELECT location_id, product_id, SUM(remaining_qty) qty FROM inventory_lots GROUP BY location_id,product_id ORDER BY location_id,product_id',
      outletOrphans: 'SELECT COUNT(*) n FROM bills b LEFT JOIN outlets o ON o.id=b.outlet_id WHERE o.id IS NULL',
      lineOrphans: 'SELECT COUNT(*) n FROM bill_line_items l LEFT JOIN bills b ON b.id=l.bill_id WHERE b.id IS NULL',
      lotOrphans: 'SELECT COUNT(*) n FROM inventory_lots l LEFT JOIN products p ON p.id=l.product_id WHERE p.id IS NULL',
    };
    const result = { counts };
    for (const [key, sql] of Object.entries(summaries)) {
      [result[key]] = await connection.query(sql);
    }
    return result;
  } finally {
    await connection.rollback();
  }
}

async function main() {
  const connection = await verifiedConnection(...process.argv.slice(2));
  try {
    console.log(JSON.stringify(await baseline(connection), null, 2));
  } finally {
    await connection.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
