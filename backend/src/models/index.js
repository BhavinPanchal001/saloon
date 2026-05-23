const { sequelize, Sequelize } = require('./db');

// Import models
const BankTransaction = require('./BankTransaction');
const Product = require('./Product');
const Outlet = require('./Outlet');
const OutletInventory = require('./OutletInventory');
const Expense = require('./Expense');
const MonthlyBudget = require('./MonthlyBudget');
const BudgetHistory = require('./BudgetHistory');
const StockIssue = require('./StockIssue');
const OutletProductPrice = require('./OutletProductPrice');
const OutletServicePrice = require('./OutletServicePrice');
const OutletPackagePrice = require('./OutletPackagePrice');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const UnitMaster = require('./UnitMaster');
const Payment = require('./Payment');
const PaymentDetail = require('./PaymentDetail');
const Bank = require('./Bank');
const Service = require('./Service');
const Package = require('./Package');
const ServiceCategory = require('./ServiceCategory');
const PackageService = require('./PackageService');
const Bill = require('./Bill');
const BillLineItem = require('./BillLineItem');
const InventoryAuditLog = require('./InventoryAuditLog');

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

PackageService.belongsTo(Package, { foreignKey: 'package_id' });
PackageService.belongsTo(Service, { foreignKey: 'service_id' });
Package.hasMany(PackageService, { foreignKey: 'package_id' });
Service.hasMany(PackageService, { foreignKey: 'service_id' });

Product.belongsTo(UnitMaster, { foreignKey: 'unit_master_id', as: 'unitMaster' });
UnitMaster.hasMany(Product, { foreignKey: 'unit_master_id' });

Payment.hasMany(PaymentDetail, { foreignKey: 'payment_id', as: 'details', onDelete: 'CASCADE' });
PaymentDetail.belongsTo(Payment, { foreignKey: 'payment_id' });

Payment.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
PurchaseOrder.hasMany(Payment, { foreignKey: 'purchase_order_id' });

Payment.belongsTo(Bank, { foreignKey: 'bank_account_id', as: 'bankAccount' });
Bank.hasMany(Payment, { foreignKey: 'bank_account_id' });

Bill.hasMany(BillLineItem, { foreignKey: 'bill_id', as: 'lineItems', onDelete: 'CASCADE' });
BillLineItem.belongsTo(Bill, { foreignKey: 'bill_id' });

Bill.hasMany(Payment, { foreignKey: 'bill_id', as: 'payments' });
Payment.belongsTo(Bill, { foreignKey: 'bill_id' });

Bill.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(Bill, { foreignKey: 'outlet_id' });

// Expense associations
Expense.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(Expense, { foreignKey: 'outlet_id' });

MonthlyBudget.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(MonthlyBudget, { foreignKey: 'outlet_id' });

BudgetHistory.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(BudgetHistory, { foreignKey: 'outlet_id' });

Bank.hasMany(BankTransaction, { foreignKey: 'bank_id', as: 'transactions', onDelete: 'CASCADE' });
BankTransaction.belongsTo(Bank, { foreignKey: 'bank_id', as: 'bank' });
BankTransaction.belongsTo(Bank, { foreignKey: 'related_bank_id', as: 'relatedBank' });

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
  Bank,
  Service,
  Package,
  ServiceCategory,
  PackageService,
  Bill,
  BillLineItem,
  BankTransaction,
  Expense,
  MonthlyBudget,
  BudgetHistory,
  InventoryAuditLog,
};
