import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { GlobalDashboardPage } from "../pages/dashboard/GlobalDashboardPage";
import { ExpenseListPage } from "../pages/expenses/ExpenseListPage";
import { ExpenseAddPage } from "../pages/expenses/ExpenseAddPage";
import { BudgetsPage } from "../pages/expenses/BudgetsPage";
import { InventoryPage } from "../pages/inventory/InventoryPage";
import { ProductSaleHistoryPage } from "../pages/inventory/ProductSaleHistoryPage";
import { PurchaseOrderHistoryPage } from "../pages/inventory/PurchaseOrderHistoryPage";
import PurchaseOrderPage from "../pages/inventory/PurchaseOrderPage";
import { UnitMasterPage } from "../pages/inventory/UnitMasterPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { OTPVerificationPage } from "../pages/auth/OTPVerificationPage";
import { OutletsPage } from "../pages/outlets/OutletsPage";
import { OutletTransactionsPage } from "../pages/outlets/OutletTransactionsPage";
import { PayrollPage } from "../pages/payroll/PayrollPage";
import { SalaryAddPage } from "../pages/payroll/SalaryAddPage";
import { SalaryViewPage } from "../pages/payroll/SalaryViewPage";
import { SalaryPayPage } from "../pages/payroll/SalaryPayPage";
import { POSPage } from "../pages/pos/POSPage";
import BillingListPage from "../pages/pos/BillingListPage";
import BillDetailPage from "../pages/pos/BillDetailPage";
import PackageListPage from "../modules/packages/pages/PackageListPage";
import { PackageFormPage } from "../modules/packages/pages/PackageFormPage";
import { PackageProfilePage } from "../modules/packages/pages/PackageProfilePage";
import ServiceListPage from "../modules/services/pages/ServiceListPage";
import ServiceFormPage from "../modules/services/pages/ServiceFormPage";
import ServiceCategoryMasterPage from "../modules/services/pages/ServiceCategoryMasterPage";
import ServiceDetailPage from "../modules/services/pages/ServiceDetailPage";
import EmployeeListPage from "../modules/employees/pages/EmployeeListPage";
import EmployeeFormPage from "../modules/employees/pages/EmployeeFormPage";
import EmployeeDetailPage from "../modules/employees/pages/EmployeeDetailPage";
import AttendancePage from "../modules/employees/pages/AttendancePage";
import AttendanceSummaryPage from "../modules/employees/pages/AttendanceSummaryPage";
import ContractListPage from "../modules/contracts/pages/management/ContractListPage";
import ContractFormPage from "../modules/contracts/pages/management/ContractFormPage";
import ContractMastersPage from "../modules/contracts/pages/management/ContractMastersPage";
import SalaryCalculationPage from '../modules/employees/pages/SalaryCalculationPage';
import CommissionMastersPage from '../modules/employees/pages/CommissionMastersPage';
import BankListPage from "../modules/bank/pages/BankListPage";
import BankFormPage from "../modules/bank/pages/BankFormPage";
import UserManagementPage from "../pages/users/UserManagementPage";
import RolePermissionsPage from "../pages/users/RolePermissionsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { NotificationsPage } from "../pages/notifications/NotificationsPage";
import { CouponManagementPage } from "../pages/coupons/CouponManagementPage";
import { VoucherManagementPage } from "../pages/vouchers/VoucherManagementPage";
import { CustomerListPage } from "../pages/customers/CustomerListPage";
import { AppointmentCalendarPage } from "../pages/appointments/AppointmentCalendarPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { POSTerminalsPage } from "../pages/pos_management/POSTerminalsPage";
import { POSShiftHistoryPage } from "../pages/pos_management/POSShiftHistoryPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { useAuthStore } from "../stores/authStore";
import { getDefaultRouteForRole } from "../utils/format";

function RoleHomeRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

function LoginRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <LoginPage />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginRoute />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/verify-otp",
    element: <OTPVerificationPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <RoleHomeRedirect />,
          },
          {
            element: <ProtectedRoute allowedRoles={["admin", "super_admin"]} />,
            children: [
              {
                path: "/outlets",
                element: <OutletsPage />,
              },
              {
                path: "/outlets/transactions",
                element: <OutletTransactionsPage />,
              },
              {
                path: "/outlets/:outletId/transactions",
                element: <OutletTransactionsPage />,
              },
              {
                path: "/users",
                element: <UserManagementPage />,
              },
              {
                path: "/roles",
                element: <RolePermissionsPage />,
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["admin", "super_admin", "manager"]} />,
            children: [
              {
                path: "/dashboard",
                element: <GlobalDashboardPage />,
              },
              {
                path: "/budgets",
                element: <BudgetsPage />,
              },
              {
                path: "/expenses",
                element: <ExpenseListPage />,
              },
              {
                path: "/expenses/add",
                element: <ExpenseAddPage />,
              },
              {
                path: "/inventory",
                element: <InventoryPage />,
              },
              {
                path: "/inventory/products/:id/sales",
                element: <ProductSaleHistoryPage />,
              },
              {
                path: "/inventory/purchase-orders",
                element: <PurchaseOrderHistoryPage />,
              },
              {
                path: "/inventory/purchase-orders/new",
                element: <PurchaseOrderPage />,
              },
              {
                path: "/inventory/purchase-orders/:id/edit",
                element: <PurchaseOrderPage />,
              },
              {
                path: "/inventory/units",
                element: <UnitMasterPage />,
              },
              {
                path: "/services",
                element: <ServiceListPage />,
              },
              {
                path: "/services/add",
                element: <ServiceFormPage />,
              },
              {
                path: "/services/edit/:id",
                element: <ServiceFormPage />,
              },
              {
                path: "/services/categories",
                element: <ServiceCategoryMasterPage />,
              },
              {
                path: "/services/:id",
                element: <ServiceDetailPage />,
              },
              {
                path: "/packages",
                element: <PackageListPage />,
              },
              {
                path: "/packages/new",
                element: <PackageFormPage />,
              },
              {
                path: "/packages/:packageId/edit",
                element: <PackageFormPage />,
              },
              {
                path: "/packages/:packageId",
                element: <PackageProfilePage />,
              },
              {
                path: "/staff",
                element: <EmployeeListPage />,
              },
              {
                path: "/staff/add",
                element: <EmployeeFormPage />,
              },
              {
                path: "/staff/edit/:id",
                element: <EmployeeFormPage />,
              },
              {
                path: "/staff/:id",
                element: <EmployeeDetailPage />,
              },
              {
                path: "/attendance",
                element: <AttendancePage />,
              },
              {
                path: "/attendance/summary",
                element: <AttendanceSummaryPage />,
              },
              {
                path: "/contracts",
                element: <ContractListPage />,
              },
              {
                path: "/contracts/list",
                element: <ContractListPage />,
              },
              {
                path: "/contracts/new",
                element: <ContractFormPage />,
              },
              {
                path: "/contracts/groups",
                element: <Navigate to="/contracts/list" replace />,
              },
              {
                path: "/contracts/groups/:id",
                element: <Navigate to="/contracts/list" replace />,
              },
              {
                path: "/contracts/masters",
                element: <ContractMastersPage />,
              },
              {
                path: "/contracts/masters/:type",
                element: <ContractMastersPage />,
              },
              {
                path: "/payroll",
                element: <PayrollPage />,
              },
              {
                path: "/salary/add",
                element: <SalaryAddPage />,
              },
              {
                path: "/salary/view/:id",
                element: <SalaryViewPage />,
              },
              {
                path: "/salary/pay",
                element: <SalaryPayPage />,
              },
              {
                path: "/payroll/calculate",
                element: <SalaryCalculationPage />,
              },
              {
                path: "/payroll/commission-masters",
                element: <CommissionMastersPage />,
              },
              {
                path: "/bank",
                element: <BankListPage />,
              },
              {
                path: "/bank/new",
                element: <BankFormPage />,
              },
              {
                path: "/bank/edit/:id",
                element: <BankFormPage />,
              },
              {
                path: "/settings",
                element: <SettingsPage />,
              },
              {
                path: "/customers",
                element: <CustomerListPage />,
              },
              {
                path: "/appointments",
                element: <AppointmentCalendarPage />,
              },
              {
                path: "/reports",
                element: <ReportsPage />,
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["admin", "super_admin", "manager", "cashier", "pos"]} />,
            children: [
              {
                path: "/pos",
                element: <POSPage />,
              },
              {
                path: "/pos/bills",
                element: <BillingListPage />,
              },
              {
                path: "/coupons",
                element: <CouponManagementPage />,
              },
              {
                path: "/vouchers",
                element: <VoucherManagementPage />,
              },
              {
                path: "/pos/bills/:id",
                element: <BillDetailPage />,
              },
              {
                path: "/pos-management/terminals",
                element: <POSTerminalsPage />,
              },
              {
                path: "/pos-management/shift-history",
                element: <POSShiftHistoryPage />,
              },
            ],
          },
          {
            path: "/notifications",
            element: <NotificationsPage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
