import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { GlobalDashboardPage } from "../pages/dashboard/GlobalDashboardPage";
import { ExpensesPage } from "../pages/expenses/ExpensesPage";
import { BudgetsPage } from "../pages/expenses/BudgetsPage";
import { InventoryPage } from "../pages/inventory/InventoryPage";
import { PurchaseOrderHistoryPage } from "../pages/inventory/PurchaseOrderHistoryPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { OTPVerificationPage } from "../pages/auth/OTPVerificationPage";
import { OutletsPage } from "../pages/outlets/OutletsPage";
import { PayrollPage } from "../pages/payroll/PayrollPage";
import { POSPage } from "../pages/pos/POSPage";
import BillingListPage from "../pages/pos/BillingListPage";
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
import SalaryCalculationPage from "../modules/employees/pages/SalaryCalculationPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { NotificationsPage } from "../pages/notifications/NotificationsPage";
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
            element: <ProtectedRoute allowedRoles={["admin"]} />,
            children: [
              {
                path: "/dashboard",
                element: <GlobalDashboardPage />,
              },
              {
                path: "/outlets",
                element: <OutletsPage />,
              },
              {
                path: "/expenses",
                element: <ExpensesPage scope="global" />,
              },
              {
                path: "/budgets",
                element: <BudgetsPage />,
              },
            ],
          },
          {
            path: "/inventory",
            element: <InventoryPage />,
          },
          {
            path: "/inventory/po-history",
            element: <PurchaseOrderHistoryPage />,
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
            path: "/pos",
            element: <POSPage />,
          },
          {
            path: "/pos/bills",
            element: <BillingListPage />,
          },
          {
            path: "/expenses/local",
            element: <ExpensesPage scope="local" />,
          },
          {
            path: "/payroll",
            element: <PayrollPage />,
          },
          {
            path: "/payroll/calculate",
            element: <SalaryCalculationPage />,
          },
          {
            path: "/settings",
            element: <SettingsPage />,
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
