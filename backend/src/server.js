require('dotenv').config();
const { execSync } = require('child_process');
const os = require('os');
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5001;

const killPortIfBusy = (port) => {
  try {
    if (os.platform() === 'win32') {
      // Windows: use netstat + taskkill
      const result = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { stdio: 'pipe' }
      ).toString().trim();
      if (result) {
        const lines = result.split('\n');
        const pids = [...new Set(lines.map(l => l.trim().split(/\s+/).pop()).filter(Boolean))];
        for (const pid of pids) {
          if (pid && pid !== '0') {
            console.log(`Port ${port} in use by PID ${pid}. Killing...`);
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
              console.log(`PID ${pid} killed. Port ${port} is now free.`);
            } catch (_) { /* process may have already exited */ }
          }
        }
      }
    } else {
      // macOS / Linux: use lsof + kill
      const pid = execSync(`lsof -t -i:${port}`, { stdio: 'pipe' }).toString().trim();
      if (pid) {
        console.log(`Port ${port} in use by PID ${pid}. Killing...`);
        execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
        console.log(`PID ${pid} killed. Port ${port} is now free.`);
      }
    }
  } catch (_) {
    // Port is already free — nothing to do
  }
};

const startServer = async () => {
  try {
    killPortIfBusy(PORT);

    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const queryInterface = sequelize.getQueryInterface();

    // Ensure new tables exist before alter sync
    const tablesBeforeSync = await queryInterface.showAllTables();
    if (!tablesBeforeSync.includes('customers')) {
      console.log('[Migration] Creating customers table...');
      const Customer = require('./models/Customer');
      await Customer.sync({ force: true });
    }
    if (!tablesBeforeSync.includes('appointments')) {
      console.log('[Migration] Creating appointments table...');
      const Appointment = require('./models/Appointment');
      await Appointment.sync({ force: true });
    }

    if (!tablesBeforeSync.includes('pos_terminals')) {
      console.log('[Migration] Creating pos_terminals table...');
      const PosTerminal = require('./models/PosTerminal');
      await PosTerminal.sync({ force: true });
    }
    if (!tablesBeforeSync.includes('pos_shifts')) {
      console.log('[Migration] Creating pos_shifts table...');
      const PosShift = require('./models/PosShift');
      await PosShift.sync({ force: true });
    }
    if (!tablesBeforeSync.includes('pos_shift_movements')) {
      console.log('[Migration] Creating pos_shift_movements table...');
      const PosShiftMovement = require('./models/PosShiftMovement');
      await PosShiftMovement.sync({ force: true });
    }

    if (!tablesBeforeSync.includes('loyalty_tiers')) {
      console.log('[Migration] Creating loyalty_tiers table...');
      const LoyaltyTier = require('./models/LoyaltyTier');
      await LoyaltyTier.sync({ force: true });
    }
    if (!tablesBeforeSync.includes('loyalty_ledgers')) {
      console.log('[Migration] Creating loyalty_ledgers table...');
      const LoyaltyLedger = require('./models/LoyaltyLedger');
      await LoyaltyLedger.sync({ force: true });
    }
    if (!tablesBeforeSync.includes('reward_settings')) {
      console.log('[Migration] Creating reward_settings table...');
      const RewardSetting = require('./models/RewardSetting');
      await RewardSetting.sync({ force: true });
    }

    // Ensure columns exist on customers and bills tables
    try {
      const [custCols] = await sequelize.query("SHOW COLUMNS FROM customers");
      const custColNames = custCols.map(c => c.Field);
      if (!custColNames.includes('loyalty_tier_id')) {
        console.log('[Migration] Adding loyalty_tier_id column to customers table...');
        await sequelize.query("ALTER TABLE customers ADD COLUMN `loyalty_tier_id` INT UNSIGNED NULL");
      }

      const [columns] = await sequelize.query("SHOW COLUMNS FROM bills");
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('pos_terminal_id')) {
        console.log('[Migration] Adding pos_terminal_id column to bills table...');
        await sequelize.query("ALTER TABLE bills ADD COLUMN `pos_terminal_id` INT UNSIGNED NULL");
      }
      if (!colNames.includes('pos_shift_id')) {
        console.log('[Migration] Adding pos_shift_id column to bills table...');
        await sequelize.query("ALTER TABLE bills ADD COLUMN `pos_shift_id` INT UNSIGNED NULL");
      }
      if (!colNames.includes('points_earned')) {
        console.log('[Migration] Adding points_earned column to bills table...');
        await sequelize.query("ALTER TABLE bills ADD COLUMN `points_earned` INT DEFAULT 0");
      }
      if (!colNames.includes('points_redeemed')) {
        console.log('[Migration] Adding points_redeemed column to bills table...');
        await sequelize.query("ALTER TABLE bills ADD COLUMN `points_redeemed` INT DEFAULT 0");
      }
      if (!colNames.includes('points_discount_amount')) {
        console.log('[Migration] Adding points_discount_amount column to bills table...');
        await sequelize.query("ALTER TABLE bills ADD COLUMN `points_discount_amount` DECIMAL(12,2) DEFAULT 0");
      }
    } catch (colErr) {
      console.error('[Migration Warning] Checking/adding columns:', colErr.message);
    }

    // Clean up duplicate indexes on banks table caused by repeated alter syncs
    try {
      const [indexes] = await sequelize.query("SHOW INDEX FROM banks WHERE Column_name = 'account_number'");
      if (indexes && indexes.length > 2) {
        console.log(`[Migration] Cleaning up duplicate indexes on banks.account_number...`);
        const uniqueKeyNames = [...new Set(indexes.map(i => i.Key_name))].filter(k => k !== 'PRIMARY' && k !== 'account_number_2');
        for (const keyName of uniqueKeyNames) {
          try {
            await sequelize.query(`ALTER TABLE banks DROP INDEX \`${keyName}\``);
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Ensure models & tables exist
    try {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized successfully.');
    } catch (syncErr) {
      console.warn('[Warning] sequelize.sync alter failed (e.g. index limit reached), falling back to standard sync:', syncErr.message);
      await sequelize.sync();
      console.log('Database models synchronized via standard sync.');
    }

    // Seed Default Walk-in Guest customer
    try {
      const { Customer } = require('./models');
      const [defaultGuest, created] = await Customer.findOrCreate({
        where: { phone: '0000000000' },
        defaults: {
          name: 'Walk-in Guest',
          phone: '0000000000',
          email: 'walkin@glowy.local',
          gender: 'female',
          credit_balance: 0.00,
        },
      });
      if (created) {
        console.log('[Seed] Created default Walk-in Guest customer (ID: ' + defaultGuest.id + ').');
      }
    } catch (guestErr) {
      console.error('[Seed Error] Failed to seed Walk-in Guest customer:', guestErr.message);
    }

    // Run migration check for services table
    const tableInfo = await queryInterface.describeTable('services');
    if (!tableInfo.assigned_outlet_ids) {
      console.log('[Migration] Adding column assigned_outlet_ids to services...');
      const { DataTypes } = require('sequelize');
      await queryInterface.addColumn('services', 'assigned_outlet_ids', {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      });
      console.log('[Migration] Column assigned_outlet_ids added successfully.');
    }

    // Run migration check for purchase_orders table
    const poTableInfo = await queryInterface.describeTable('purchase_orders');
    if (!poTableInfo.outlet_id) {
      console.log('[Migration] Adding column outlet_id to purchase_orders...');
      const { DataTypes } = require('sequelize');
      await queryInterface.addColumn('purchase_orders', 'outlet_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
      console.log('[Migration] Column outlet_id added successfully to purchase_orders.');
    }

    // Run migration check for coupons table
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('coupons')) {
      console.log('[Migration] Creating coupons table...');
      const { Coupon } = require('./models');
      await Coupon.sync({ force: true });
      console.log('[Migration] Table coupons created successfully.');
    }
 if (!tables.includes('customer_ledgers')) {
      console.log('[Migration] Creating customer_ledgers table...');
      const CustomerLedger = require('./models/CustomerLedger');
      await CustomerLedger.sync({ force: true });
      console.log('[Migration] Table customer_ledgers created successfully.');
    }
    // Run migration check for admins table
    const adminsTableInfo = await queryInterface.describeTable('admins');
    if (!adminsTableInfo.outlet_id) {
      console.log('[Migration] Adding column outlet_id to admins...');
      const { DataTypes } = require('sequelize');
      await queryInterface.addColumn('admins', 'outlet_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
      console.log('[Migration] Column outlet_id added successfully to admins.');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is still in use after kill attempt. Exiting...`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
