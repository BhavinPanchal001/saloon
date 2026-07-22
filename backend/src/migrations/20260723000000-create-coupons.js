'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // 1. Create coupons table
    await queryInterface.createTable('coupons', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discount_type: {
        type: DataTypes.ENUM('percent', 'flat'),
        allowNull: false,
        defaultValue: 'percent',
      },
      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      min_spend: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      max_discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      usage_limit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      used_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 2. Add coupon_id and coupon_code to bills table if they don't exist
    const billsTable = await queryInterface.describeTable('bills');
    if (!billsTable.coupon_id) {
      await queryInterface.addColumn('bills', 'coupon_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }
    if (!billsTable.coupon_code) {
      await queryInterface.addColumn('bills', 'coupon_code', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupons');
    const billsTable = await queryInterface.describeTable('bills');
    if (billsTable.coupon_id) await queryInterface.removeColumn('bills', 'coupon_id');
    if (billsTable.coupon_code) await queryInterface.removeColumn('bills', 'coupon_code');
  },
};
