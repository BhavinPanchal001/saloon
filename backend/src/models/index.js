const { sequelize, Sequelize } = require('./db');

// Import models
const Product = require('./Product');
const Outlet = require('./Outlet');
const OutletInventory = require('./OutletInventory');
const StockIssue = require('./StockIssue');
const OutletProductPrice = require('./OutletProductPrice');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const UnitMaster = require('./UnitMaster');
const Payment = require('./Payment');
const PaymentDetail = require('./PaymentDetail');

// Define associations
OutletInventory.belongsTo(Product, { foreignKey: 'product_id' });
OutletInventory.belongsTo(Outlet, { foreignKey: 'outlet_id' });

StockIssue.belongsTo(Product, { foreignKey: 'product_id' });
StockIssue.belongsTo(Outlet, { foreignKey: 'outlet_id' });

OutletProductPrice.belongsTo(Product, { foreignKey: 'product_id' });
OutletProductPrice.belongsTo(Outlet, { foreignKey: 'outlet_id' });

Product.belongsTo(UnitMaster, { foreignKey: 'unit_master_id', as: 'unitMaster' });
UnitMaster.hasMany(Product, { foreignKey: 'unit_master_id' });

Payment.hasMany(PaymentDetail, { foreignKey: 'payment_id', as: 'details', onDelete: 'CASCADE' });
PaymentDetail.belongsTo(Payment, { foreignKey: 'payment_id' });

Payment.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
PurchaseOrder.hasMany(Payment, { foreignKey: 'purchase_order_id' });

module.exports = {
  sequelize,
  Sequelize,
  Product,
  Outlet,
  OutletInventory,
  StockIssue,
  OutletProductPrice,
  PurchaseOrder,
  PurchaseOrderItem,
  UnitMaster,
  Payment,
  PaymentDetail,
};
