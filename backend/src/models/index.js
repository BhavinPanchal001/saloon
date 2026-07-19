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
const Notification = require('./Notification');

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
PurchaseOrder.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(PurchaseOrder, { foreignKey: 'outlet_id' });

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

Expense.hasMany(Payment, { foreignKey: 'expense_id', as: 'payments' });
Payment.belongsTo(Expense, { foreignKey: 'expense_id' });

MonthlyBudget.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(MonthlyBudget, { foreignKey: 'outlet_id' });

BudgetHistory.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(BudgetHistory, { foreignKey: 'outlet_id' });

Notification.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Notification.belongsTo(Product, { foreignKey: 'product_id' });

Bank.hasMany(BankTransaction, { foreignKey: 'bank_id', as: 'transactions', onDelete: 'CASCADE' });
BankTransaction.belongsTo(Bank, { foreignKey: 'bank_id', as: 'bank' });
BankTransaction.belongsTo(Bank, { foreignKey: 'related_bank_id', as: 'relatedBank' });

// ─── NEW HR, EMPLOYEE & CONTRACT ASSOCIATIONS ────────────────────────────────
const Role = require('./Role');
const Shift = require('./Shift');
const LeaveType = require('./LeaveType');
const WorkWeek = require('./WorkWeek');
const ContractType = require('./ContractType');
const ContractTypeTemplate = require('./ContractTypeTemplate');
const HolidayTemplate = require('./HolidayTemplate');
const HolidayOccasion = require('./HolidayOccasion');
const SalaryComponentMaster = require('./SalaryComponentMaster');
const ContractGroup = require('./ContractGroup');
const Staff = require('./Staff');
const Contract = require('./Contract');
const ContractSalaryMapping = require('./ContractSalaryMapping');
const Attendance = require('./Attendance');

// Staff associations
Staff.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(Staff, { foreignKey: 'role_id' });

Staff.belongsTo(Outlet, { foreignKey: 'assigned_outlet_id', as: 'outlet' });
Outlet.hasMany(Staff, { foreignKey: 'assigned_outlet_id' });

// Contract type templates
ContractType.hasMany(ContractTypeTemplate, { foreignKey: 'contract_type_id', as: 'templates', onDelete: 'CASCADE' });
ContractTypeTemplate.belongsTo(ContractType, { foreignKey: 'contract_type_id' });

// Holiday occasions
HolidayTemplate.hasMany(HolidayOccasion, { foreignKey: 'holiday_template_id', as: 'occasions', onDelete: 'CASCADE' });
HolidayOccasion.belongsTo(HolidayTemplate, { foreignKey: 'holiday_template_id' });

// Contract Group associations
ContractGroup.belongsTo(Staff, { foreignKey: 'employee_id', as: 'employee' });
Staff.hasMany(ContractGroup, { foreignKey: 'employee_id', as: 'contractGroups' });

// Contract associations
Contract.belongsTo(Staff, { foreignKey: 'employee_id', as: 'employee' });
Staff.hasMany(Contract, { foreignKey: 'employee_id', as: 'contracts', onDelete: 'CASCADE' });

Contract.belongsTo(ContractGroup, { foreignKey: 'group_id', as: 'group' });
ContractGroup.hasMany(Contract, { foreignKey: 'group_id', as: 'contracts' });

Contract.belongsTo(ContractType, { foreignKey: 'type_id', as: 'contractType' });
Contract.belongsTo(ContractTypeTemplate, { foreignKey: 'template_id', as: 'documentTemplate' });
Contract.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });
Contract.belongsTo(WorkWeek, { foreignKey: 'work_week_id', as: 'workWeek' });

// Contract Salary component mappings
Contract.hasMany(ContractSalaryMapping, { foreignKey: 'contract_id', as: 'salaryComponents', onDelete: 'CASCADE' });
ContractSalaryMapping.belongsTo(Contract, { foreignKey: 'contract_id' });
ContractSalaryMapping.belongsTo(SalaryComponentMaster, { foreignKey: 'salary_component_id', as: 'masterComponent' });

// Attendance associations
Attendance.belongsTo(Staff, { foreignKey: 'staff_id', as: 'employee' });
Staff.hasMany(Attendance, { foreignKey: 'staff_id', as: 'attendances', onDelete: 'CASCADE' });

module.exports = {
  sequelize,
  Sequelize,
  Attendance,
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
  Notification,
  
  // Export new models
  Role,
  Shift,
  LeaveType,
  WorkWeek,
  ContractType,
  ContractTypeTemplate,
  HolidayTemplate,
  HolidayOccasion,
  SalaryComponentMaster,
  ContractGroup,
  Staff,
  Contract,
  ContractSalaryMapping,
};
