
import type { ReactNode } from "react";

import StorefrontHeader from "../components/storefront/StorefrontHeader";
import StorefrontFooter from "../components/storefront/StorefrontFooter";
import MemberComplaintWidget from "../components/member/MemberComplaintWidget";

import "../pages/HomePage.css";

type StorefrontLayoutProps = {
  children: ReactNode;
};

export default function StorefrontLayout({
  children,
}: StorefrontLayoutProps) {
  return (
    <div className="home-page storefront-layout">
      <StorefrontHeader />

      <div className="storefront-layout-content">
        {children}
      </div>

      <StorefrontFooter />

      <MemberComplaintWidget />
    </div>
  );
}
