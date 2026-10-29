
import { useState } from "react";
import type { FormEvent } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";

import {
    registerMember,
} from "../../services/api/auth.api";

import type {
    RegisterInput,
} from "../../services/api/auth.api";

import "./RegisterPage.css";

function RegisterPage() {

    const [searchParams] = useSearchParams();


    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [inviteCode, setInviteCode] = useState(
        () => searchParams.get("affiliateCode")?.trim() ?? "",
    );
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setError("");

        if (!email.trim() && !phone.trim()) {
            setError("Vui lòng nhập email hoặc số điện thoại.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            const input: RegisterInput = {
                fullName: fullName.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                password,
                inviteCode: inviteCode.trim() || undefined,
            };

            await registerMember(input);

            navigate("/login", {
                replace: true,
                state: {
                    registered: true,
                },
            });
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "REGISTER_FAILED",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="member-register-page">
            <section className="member-register-shell">
                <aside className="member-register-brand">
                    <Link
                        to="/"
                        className="member-register-logo"
                    >
                        ICON<span>DENIM</span>
                    </Link>

                    <div className="member-register-brand-content">
                        <p className="member-register-eyebrow">
                            JOIN THE COMMUNITY
                        </p>

                        <h1>
                            Your style.
                            <br />
                            Your <em>identity.</em>
                        </h1>

                        <p>
                            Tạo tài khoản IconDenim để bắt đầu hành trình
                            mua sắm và quản lý đơn hàng của bạn.
                        </p>
                    </div>

                    <footer className="member-register-brand-footer">
                        <span>EST. ICONDENIM</span>
                        <span>DENIM MADE FOR YOU</span>
                    </footer>
                </aside>

                <section className="member-register-form-panel">
                    <Link
                        to="/"
                        className="member-register-mobile-logo"
                    >
                        ICON<span>DENIM</span>
                    </Link>

                    <div className="member-register-form-container">
                        <header className="member-register-heading">
                            <p className="member-register-eyebrow">
                                CREATE YOUR ACCOUNT
                            </p>

                            <h2>Tạo tài khoản</h2>

                            <p>
                                Điền thông tin bên dưới để tham gia IconDenim.
                            </p>
                        </header>

                        <form
                            className="member-register-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="member-register-field">
                                <label htmlFor="register-fullName">
                                    Họ và tên
                                </label>

                                <input
                                    id="register-fullName"
                                    name="fullName"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Nhập họ và tên"
                                    value={fullName}
                                    onChange={(event) =>
                                        setFullName(event.target.value)
                                    }
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="member-register-field">
                                <label htmlFor="register-email">
                                    Email
                                </label>

                                <input
                                    id="register-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    disabled={loading}
                                />
                            </div>

                            <div className="member-register-field">
                                <label htmlFor="register-phone">
                                    Số điện thoại
                                </label>

                                <input
                                    id="register-phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="Nhập số điện thoại"
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(event.target.value)
                                    }
                                    disabled={loading}
                                />
                            </div>

                            <p className="member-register-hint">
                                Bạn cần cung cấp ít nhất email hoặc số điện thoại.
                            </p>

                            <div className="member-register-field">
                                <label htmlFor="register-password">
                                    Mật khẩu
                                </label>

                                <input
                                    id="register-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Tạo mật khẩu"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="member-register-field">
                                <label htmlFor="register-confirmPassword">
                                    Xác nhận mật khẩu
                                </label>

                                <input
                                    id="register-confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(event.target.value)
                                    }
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="member-register-field">
                                <label htmlFor="register-inviteCode">
                                    Mã giới thiệu
                                    <span className="member-register-optional">
                                        {" "}— Không bắt buộc
                                    </span>
                                </label>

                                <input
                                    id="register-inviteCode"
                                    name="inviteCode"
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Nhập mã giới thiệu nếu có"
                                    value={inviteCode}
                                    onChange={(event) =>
                                        setInviteCode(event.target.value)
                                    }
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div
                                    className="member-register-error"
                                    role="alert"
                                >
                                    <span>!</span>
                                    <p>{error}</p>
                                </div>
                            )}

                            <button
                                className="member-register-submit"
                                type="submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "ĐANG TẠO TÀI KHOẢN..."
                                    : "TẠO TÀI KHOẢN"}
                                {!loading && <span aria-hidden="true">→</span>}
                            </button>
                        </form>

                        <p className="member-register-login-link">
                            Đã có tài khoản?{" "}
                            <Link to="/login">Đăng nhập</Link>
                        </p>
                    </div>

                    <footer className="member-register-footer">
                        <span>© IconDenim</span>
                        <span>Denim made for you.</span>
                    </footer>
                </section>
            </section>
        </main>
    );
}

export default RegisterPage;
