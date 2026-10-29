
import type { ReactNode } from "react";

import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";

import "./AdminLayout.css";

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <AdminHeader />

      <AdminSidebar />

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;

