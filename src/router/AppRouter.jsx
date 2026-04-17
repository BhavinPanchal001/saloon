import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { OutletDashboardPage } from "../pages/dashboard/OutletDashboardPage";
import { GlobalDashboardPage } from "../pages/dashboard/GlobalDashboardPage";
import { ExpensesPage } from "../pages/expenses/ExpensesPage";
import { InventoryPage } from "../pages/inventory/InventoryPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { OutletsPage } from "../pages/outlets/OutletsPage";
import { OutletFormPage } from "../pages/outlets/OutletFormPage";
import { PayrollPage } from "../pages/payroll/PayrollPage";
import { POSPage } from "../pages/pos/POSPage";
import { PackageFormPage } from "../pages/packages/PackageFormPage";
import { PackageProfilePage } from "../pages/packages/PackageProfilePage";
import { PackagesPage } from "../pages/packages/PackagesPage";
import { ServicesPage } from "../pages/services/ServicesPage";
import EmployeeListPage from "../modules/employees/pages/EmployeeListPage";
import EmployeeFormPage from "../modules/employees/pages/EmployeeFormPage";
import EmployeeDetailPage from "../modules/employees/pages/EmployeeDetailPage";
import AttendancePage from "../modules/employees/pages/AttendancePage";
import ContractListPage from "../modules/contracts/pages/management/ContractListPage";
import ContractFormPage from "../modules/contracts/pages/management/ContractFormPage";
import GroupListPage from "../modules/contracts/pages/groups/GroupListPage";
import GroupDetailPage from "../modules/contracts/pages/groups/GroupDetailPage";
import MasterManagementPage from "../modules/contracts/pages/masters/MasterManagementPage";
import MasterCRUDPage from "../modules/contracts/pages/masters/MasterCRUDPage";
import SalaryCalculationPage from "../modules/employees/pages/SalaryCalculationPage";
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
                path: "/dashboard/global",
                element: <GlobalDashboardPage />,
              },
              {
                path: "/outlets",
                element: <OutletsPage />,
              },
              {
                path: "/outlets/new",
                element: <OutletFormPage />,
              },
              {
                path: "/outlets/:outletId/edit",
                element: <OutletFormPage />,
              },
              {
                path: "/expenses",
                element: <ExpensesPage scope="global" />,
              },
            ],
          },
          {
            path: "/dashboard/outlet",
            element: <OutletDashboardPage />,
          },
          {
            path: "/inventory",
            element: <InventoryPage />,
          },
          {
            path: "/services",
            element: <ServicesPage />,
          },
          {
            path: "/packages",
            element: <PackagesPage />,
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
            element: <GroupListPage />,
          },
          {
            path: "/contracts/groups/:id",
            element: <GroupDetailPage />,
          },
          {
            path: "/contracts/masters",
            element: <MasterManagementPage />,
          },
          {
            path: "/contracts/masters/:type",
            element: <MasterCRUDPage />,
          },
          {
            path: "/pos",
            element: <POSPage />,
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
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
