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

    // Run migration check for services table
    const queryInterface = sequelize.getQueryInterface();
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
