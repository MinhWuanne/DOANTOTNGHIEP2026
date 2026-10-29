import { useNavigate, useLocation, NavLink } from "react-router-dom";
import {
    clearAuthSession,
    getAuthRole,
} from "../../utils/auth";

import "./FranchiseSidebar.css";

function OverviewIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
    );
}

function NetworkIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="6" cy="18" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
            <path d="M12 7.5V12M12 12H6v3.5M12 12h6v3.5" />
        </svg>
    );
}

function WalletIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7a3 3 0 0 1 3-3h12v16H7a3 3 0 0 1-3-3V7Z" />
            <path d="M4 8h15M15 13h4" />
            <circle cx="15" cy="13" r="1" />
        </svg>
    );
}

function CommissionIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M8 8h.01M16 16h.01" />
            <circle cx="8" cy="8" r="2.5" />
            <circle cx="16" cy="16" r="2.5" />
        </svg>
    );
}

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3" />
            <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5" />
            <path d="m13 8 4 4-4 4m4-4H9" />
        </svg>
    );
}

function FranchiseSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const role = getAuthRole("FRANCHISE");

    function handleLogout() {
        clearAuthSession("FRANCHISE");
        navigate("/login", { replace: true });
    }

    const isOverview = location.pathname === "/franchise";

    return (
        <aside className="franchise-sidebar">
            <div className="franchise-sidebar-brand">
                <div className="franchise-sidebar-brand-mark">D</div>

                <div className="franchise-sidebar-brand-text">
                    <strong>DENIM</strong>
                    <span>ECOMMERCE</span>
                </div>
            </div>

            <nav className="franchise-sidebar-nav">
                <div className="franchise-sidebar-section">
                    <span className="franchise-sidebar-section-title">
                        TỔNG QUAN
                    </span>

                    <NavLink
                        to="/franchise"
                        end
                        className={`franchise-sidebar-link${isOverview ? " active" : ""}`}
                    >
                        <OverviewIcon />
                        <span>Tổng quan</span>
                    </NavLink>
                </div>

                <div className="franchise-sidebar-section">
                    <span className="franchise-sidebar-section-title">
                        PHÁT TRIỂN MẠNG LƯỚI
                    </span>

                    <NavLink
                        to="/franchise/network"
                        className={({ isActive }) =>
                            `franchise-sidebar-link${isActive ? " active" : ""}`
                        }
                    >
                        <NetworkIcon />
                        <span>Mạng lưới tuyến dưới</span>
                    </NavLink>
                </div>

                <div className="franchise-sidebar-section">
                    <span className="franchise-sidebar-section-title">
                        TÀI CHÍNH
                    </span>

                    <NavLink
                        to="/franchise/wallet"
                        className={({ isActive }) =>
                            `franchise-sidebar-link${isActive ? " franchise-sidebar-link-active" : ""}`
                        }
                    >
                        <WalletIcon />
                        <span>Ví của tôi</span>
                    </NavLink>

                    <NavLink
                        to="/franchise/commission"
                        className={({ isActive }) =>
                            `franchise-sidebar-link${isActive ? " franchise-sidebar-link-active" : ""}`
                        }
                    >
                        <CommissionIcon />
                        <span>Hoa hồng</span>
                    </NavLink>
                </div>

                <div className="franchise-sidebar-section">
                    <span className="franchise-sidebar-section-title">
                        TÀI KHOẢN
                    </span>

                    <NavLink
                        to="/franchise/profile"
                        className={({ isActive }) =>
                            `franchise-sidebar-link${isActive ? " active" : ""}`
                        }
                    >
                        <ProfileIcon />
                        <span>Hồ sơ cá nhân</span>
                    </NavLink>
                </div>
            </nav>

            <div className="franchise-sidebar-footer">
                <div className="franchise-sidebar-role">
                    <span>QUYỀN TRUY CẬP</span>
                    <strong>{role === "FRANCHISE" ? "FRANCHISE" : "TÀI KHOẢN"}</strong>
                </div>

                <button
                    type="button"
                    className="franchise-sidebar-logout"
                    onClick={handleLogout}
                >
                    <LogoutIcon />
                    <span>Đăng xuất</span>
                </button>
            </div>
        </aside>
    );
}

export default FranchiseSidebar;