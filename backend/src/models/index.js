const { sequelize, Sequelize } = require('./db');

// Import models
const Product = require('./Product');
const Outlet = require('./Outlet');
const OutletInventory = require('./OutletInventory');
const StockIssue = require('./StockIssue');
const OutletProductPrice = require('./OutletProductPrice');
const OutletServicePrice = require('./OutletServicePrice');
const OutletPackagePrice = require('./OutletPackagePrice');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const UnitMaster = require('./UnitMaster');
const Payment = require('./Payment');
const PaymentDetail = require('./PaymentDetail');
const Service = require('./Service');
const Package = require('./Package');
const ServiceCategory = require('./ServiceCategory');
const Bill = require('./Bill');
const BillLineItem = require('./BillLineItem');

// Define associations
OutletInventory.belongsTo(Product, { foreignKey: 'product_id' });
OutletInventory.belongsTo(Outlet, { foreignKey: 'outlet_id' });

StockIssue.belongsTo(Product, { foreignKey: 'product_id' });
StockIssue.belongsTo(Outlet, { foreignKey: 'outlet_id' });

OutletProductPrice.belongsTo(Product, { foreignKey: 'product_id' });
OutletProductPrice.belongsTo(Outlet, { foreignKey: 'outlet_id' });

OutletServicePrice.belongsTo(Service, { foreignKey: 'service_id' });
OutletServicePrice.belongsTo(Outlet, { foreignKey: 'outlet_id' });

OutletPackagePrice.belongsTo(Package, { foreignKey: 'package_id' });
OutletPackagePrice.belongsTo(Outlet, { foreignKey: 'outlet_id' });

Product.belongsTo(UnitMaster, { foreignKey: 'unit_master_id', as: 'unitMaster' });
UnitMaster.hasMany(Product, { foreignKey: 'unit_master_id' });

Payment.hasMany(PaymentDetail, { foreignKey: 'payment_id', as: 'details', onDelete: 'CASCADE' });
PaymentDetail.belongsTo(Payment, { foreignKey: 'payment_id' });

Payment.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
PurchaseOrder.hasMany(Payment, { foreignKey: 'purchase_order_id' });

Bill.hasMany(BillLineItem, { foreignKey: 'bill_id', as: 'lineItems', onDelete: 'CASCADE' });
BillLineItem.belongsTo(Bill, { foreignKey: 'bill_id' });

module.exports = {
  sequelize,
  Sequelize,
  Product,
  Outlet,
  OutletInventory,
  StockIssue,
  OutletProductPrice,
  OutletServicePrice,
  OutletPackagePrice,
  PurchaseOrder,
  PurchaseOrderItem,
  UnitMaster,
  Payment,
  PaymentDetail,
  Service,
  Package,
  ServiceCategory,
  Bill,
  BillLineItem,
};
