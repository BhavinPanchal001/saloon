const { sequelize, Sequelize } = require('./db');

// Import all models first
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
const Coupon = require('./Coupon');
const Customer = require('./Customer');
const CustomerLedger = require('./CustomerLedger');
const Appointment = require('./Appointment');
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
const ProcessedPayroll = require('./ProcessedPayroll');
const ProcessedPayrollDetail = require('./ProcessedPayrollDetail');
const Admin = require('./Admin');
const PosTerminal = require('./PosTerminal');
const PosShift = require('./PosShift');
const PosShiftMovement = require('./PosShiftMovement');
const LoyaltyTier = require('./LoyaltyTier');
const LoyaltyLedger = require('./LoyaltyLedger');
const RewardSetting = require('./RewardSetting');
const CustomerVoucher = require('./CustomerVoucher');

// Define associations
OutletInventory.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(OutletInventory, { foreignKey: 'product_id', as: 'OutletInventories' });
Product.hasMany(OutletInventory, { foreignKey: 'product_id' });
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

Bill.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });
Coupon.hasMany(Bill, { foreignKey: 'coupon_id' });

Bill.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Bill, { foreignKey: 'customer_id' });

CustomerLedger.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(CustomerLedger, { foreignKey: 'customer_id', as: 'ledgers' });
CustomerLedger.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });
Bill.hasMany(CustomerLedger, { foreignKey: 'bill_id', as: 'customerLedgers' });

Appointment.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Appointment, { foreignKey: 'customer_id' });

Appointment.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
Outlet.hasMany(Appointment, { foreignKey: 'outlet_id' });

Appointment.belongsTo(Staff, { foreignKey: 'staff_id', as: 'staff' });
Staff.hasMany(Appointment, { foreignKey: 'staff_id' });

Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasMany(Appointment, { foreignKey: 'service_id' });

Appointment.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

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

// Contract Group contract associations
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

// Processed Payroll associations
ProcessedPayroll.hasMany(ProcessedPayrollDetail, { as: 'details', foreignKey: 'processed_payroll_id', onDelete: 'CASCADE' });
ProcessedPayrollDetail.belongsTo(ProcessedPayroll, { foreignKey: 'processed_payroll_id' });

ProcessedPayroll.belongsTo(Outlet, { foreignKey: 'outlet_id' });
Outlet.hasMany(ProcessedPayroll, { foreignKey: 'outlet_id' });

ProcessedPayrollDetail.belongsTo(Staff, { foreignKey: 'staff_id', as: 'employee' });
Staff.hasMany(ProcessedPayrollDetail, { foreignKey: 'staff_id', as: 'payrollDetails', onDelete: 'CASCADE' });

Admin.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
Outlet.hasMany(Admin, { foreignKey: 'outlet_id', as: 'admins' });

// POS Terminal & Shift associations
PosTerminal.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
Outlet.hasMany(PosTerminal, { foreignKey: 'outlet_id', as: 'terminals' });

PosShift.belongsTo(PosTerminal, { foreignKey: 'pos_terminal_id', as: 'terminal' });
PosTerminal.hasMany(PosShift, { foreignKey: 'pos_terminal_id', as: 'shifts' });

PosShift.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
Outlet.hasMany(PosShift, { foreignKey: 'outlet_id' });

PosShift.belongsTo(Admin, { foreignKey: 'user_id', as: 'user' });
Admin.hasMany(PosShift, { foreignKey: 'user_id' });

PosShiftMovement.belongsTo(PosShift, { foreignKey: 'pos_shift_id', as: 'shift' });
PosShift.hasMany(PosShiftMovement, { foreignKey: 'pos_shift_id', as: 'movements', onDelete: 'CASCADE' });

PosShiftMovement.belongsTo(Admin, { foreignKey: 'user_id', as: 'user' });

Bill.belongsTo(PosTerminal, { foreignKey: 'pos_terminal_id', as: 'terminal' });
Bill.belongsTo(PosShift, { foreignKey: 'pos_shift_id', as: 'shift' });
PosShift.hasMany(Bill, { foreignKey: 'pos_shift_id', as: 'bills' });
Bill.belongsTo(Admin, { foreignKey: 'created_by', as: 'creator' });
Admin.hasMany(Bill, { foreignKey: 'created_by', as: 'createdBills' });

Customer.belongsTo(LoyaltyTier, { foreignKey: 'loyalty_tier_id', as: 'loyaltyTier' });
LoyaltyTier.hasMany(Customer, { foreignKey: 'loyalty_tier_id' });

Customer.hasMany(LoyaltyLedger, { foreignKey: 'customer_id', as: 'loyaltyLedgers' });
LoyaltyLedger.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Bill.hasMany(LoyaltyLedger, { foreignKey: 'bill_id', as: 'loyaltyLedgers' });
LoyaltyLedger.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

// CustomerVoucher associations
Customer.hasMany(CustomerVoucher, { foreignKey: 'customer_id', as: 'vouchers' });
CustomerVoucher.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Bill.belongsTo(CustomerVoucher, { foreignKey: 'voucher_id', as: 'voucher' });
CustomerVoucher.hasMany(Bill, { foreignKey: 'voucher_id', as: 'bills' });
CustomerVoucher.belongsTo(Bill, { foreignKey: 'redeemed_bill_id', as: 'redeemedBill' });
CustomerVoucher.belongsTo(Bill, { foreignKey: 'issued_from_bill_id', as: 'sourceBill' });
Bill.hasOne(CustomerVoucher, { foreignKey: 'issued_from_bill_id', as: 'awardedVoucher' });

module.exports = {
  sequelize,
  Sequelize,
  Admin,
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
  Coupon,
  Customer,
  CustomerLedger,
  Appointment,
  ProcessedPayroll,
  ProcessedPayrollDetail,
  PosTerminal,
  PosShift,
  PosShiftMovement,
  LoyaltyTier,
  LoyaltyLedger,
  RewardSetting,
  CustomerVoucher,
};
