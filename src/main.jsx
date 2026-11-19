import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/AppRouter";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./index.css";
import WorkspaceApp from "./saas/WorkspaceApp";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {import.meta.env.VITE_SAAS_MODE === "true" ? <WorkspaceApp /> : <RouterProvider router={router} />}
    </ErrorBoundary>
  </React.StrictMode>,
);
