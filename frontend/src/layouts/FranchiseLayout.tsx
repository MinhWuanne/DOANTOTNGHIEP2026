import type { ReactNode } from "react";
import FranchiseSidebar from "../components/franchise/FranchiseSidebar";

import "./FranchiseLayout.css";

interface FranchiseLayoutProps {
  children: ReactNode;
}

function FranchiseLayout({ children }: FranchiseLayoutProps) {
  return (
    <div className="franchise-layout">
      <FranchiseSidebar />

      <div className="franchise-layout-main">
        <header className="franchise-layout-header">
          <div className="franchise-layout-header-title">
            <span>DENIM ECOMMERCE</span>
            <strong>Kênh đại lý</strong>
          </div>

          <div className="franchise-layout-header-badge">
            <span className="franchise-layout-status-dot" />
            FRANCHISE
          </div>
        </header>

        <main className="franchise-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default FranchiseLayout;