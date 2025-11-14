import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import QA from "./pages/QA.jsx";
import Covers from "./pages/Covers.jsx";
import Complete from "./pages/Complete.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import Users from "./pages/admin/Users.jsx";
import UserDetail from "./pages/admin/UserDetail.jsx";
import { AuthProvider } from "./shared/AuthContext.jsx";
import { QuestionsProvider } from "./shared/QuestionsContext.jsx";
import Protected from "./shared/Protected.jsx";
import AdminProtected from "./shared/AdminProtected.jsx";
import Templates from "./pages/admin/Templates.jsx";
import Settings from "./pages/admin/Settings.jsx";
const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },
  {
    path: "/dashboard",
    element: (
      <Protected>
        <Dashboard />
      </Protected>
    ),
  },
  {
    path: "/qa",
    element: (
      <Protected>
        <QA />
      </Protected>
    ),
  },
  {
    path: "/covers",
    element: (
      <Protected>
        <Covers />
      </Protected>
    ),
  },
  {
    path: "/complete",
    element: (
      <Protected>
        <Complete />
      </Protected>
    ),
  },
  { path: "/admin/login", element: <AdminLogin /> },
  {
    path: "/admin",
    element: (
      <AdminProtected>
        <AdminLayout />
      </AdminProtected>
    ),
    children: [
      { index: true, element: <Users /> },
      { path: "users/:id", element: <UserDetail /> },
      { path: "templates", element: <Templates /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <QuestionsProvider>
        <RouterProvider router={router} />
      </QuestionsProvider>
    </AuthProvider>
  </React.StrictMode>
);
