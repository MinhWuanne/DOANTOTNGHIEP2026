import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMemberProfile } from "../../services/api/auth.api";
import {
  getMemberAddresses,
  type MemberAddress,
} from "../../services/api/member-address.api";

import {
  checkoutMemberCart,
  getMemberOrderPaymentInstruction,
  type MemberPaymentInstruction,
  type MemberPaymentMethod,
} from "../../services/api/member-checkout.api";


import "./MemberCheckoutPage.css";

const PAYMENT_METHODS: {
  value: MemberPaymentMethod;
  label: string;
  description: string;
}[] = [
    {
      value: "COD",
      label: "Thanh toán khi nhận hàng (COD)",
      description: "Thanh toán khi đơn hàng được giao đến bạn.",
    },
    {
      value: "BANK_TRANSFER",
      label: "Chuyển khoản ngân hàng",
      description: "Đơn hàng được tạo với trạng thái thanh toán chưa hoàn tất.",
    },
    {
      value: "WALLET",
      label: "Ví thành viên",
      description: "Thanh toán trực tiếp từ số dư ví thành viên.",
    },
  ];

function getErrorMessage(error: unknown): string {
  const code =
    error instanceof Error ? error.message : "CHECKOUT_FAILED";

  const messages: Record<string, string> = {
    AUTHORIZATION_REQUIRED: "Vui lòng đăng nhập để tiếp tục thanh toán.",
    ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản thành viên.",
    ACCOUNT_PLATFORM_MISMATCH: "Tài khoản không hợp lệ.",
    MEMBER_ACCOUNT_REQUIRED: "Chức năng này chỉ dành cho thành viên.",
    ACCOUNT_NOT_ACTIVE: "Tài khoản thành viên hiện không hoạt động.",
    ADDRESS_NOT_FOUND: "Không tìm thấy địa chỉ nhận hàng.",
    ADDRESS_NOT_BELONG_TO_ACCOUNT_PERSON:
      "Địa chỉ nhận hàng không thuộc tài khoản của bạn.",
    CART_NOT_FOUND: "Không tìm thấy giỏ hàng.",
    CART_EMPTY: "Giỏ hàng đang trống.",
    PRODUCT_NOT_FOUND: "Có sản phẩm không còn tồn tại.",
    PRODUCT_NOT_ACTIVE: "Có sản phẩm hiện không còn kinh doanh.",
    VARIANT_NOT_FOUND: "Có phiên bản sản phẩm không còn tồn tại.",
    VARIANT_NOT_ACTIVE: "Có phiên bản sản phẩm hiện không còn kinh doanh.",
    INVALID_QUANTITY: "Số lượng sản phẩm không hợp lệ.",
    INSUFFICIENT_AVAILABLE_STOCK:
      "Tồn kho không đủ để đáp ứng số lượng đặt mua. Vui lòng quay lại giỏ hàng.",
    INVENTORY_NOT_FOUND: "Không tìm thấy thông tin tồn kho của sản phẩm.",
    WALLET_NOT_FOUND: "Không tìm thấy ví thành viên.",
    INSUFFICIENT_WALLET_BALANCE: "Số dư ví không đủ để thanh toán.",
    WALLET_BALANCE_UPDATE_FAILED:
      "Không thể cập nhật số dư ví. Vui lòng thử lại.",
    UNSUPPORTED_PAYMENT_METHOD: "Phương thức thanh toán không được hỗ trợ.",
    ADDRESS_REQUIRED: "Vui lòng chọn địa chỉ nhận hàng.",
    CHECKOUT_FAILED: "Không thể tạo đơn hàng. Vui lòng thử lại.",
  };

  return messages[code] ?? `Thanh toán thất bại: ${code}`;
}

export default function MemberCheckoutPage() {

  const [accountId, setAccountId] = useState("");
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<MemberPaymentMethod>("COD");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");

  const [successPaymentMethod, setSuccessPaymentMethod] =
    useState<MemberPaymentMethod | "">("");
  const [paymentInstruction, setPaymentInstruction] =
    useState<MemberPaymentInstruction | null>(null);
  const [instructionLoading, setInstructionLoading] = useState(false);
  const [instructionError, setInstructionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      setLoading(true);
      setPageError("");

      try {
        const profile = await getMemberProfile();

        const memberAccount = profile.accounts.find(
          (account) => account.platform === "MEMBER",
        );

        if (!memberAccount) {
          throw new Error("MEMBER_ACCOUNT_REQUIRED");
        }

        const currentAccountId = String(memberAccount.id);

        const memberAddresses =
          await getMemberAddresses(currentAccountId);

        if (cancelled) {
          return;
        }

        setAccountId(currentAccountId);
        setAddresses(memberAddresses);

        const defaultAddress = memberAddresses.find(
          (address) => address.isDefault,
        );

        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.id));
        } else if (memberAddresses.length > 0) {
          setSelectedAddressId(String(memberAddresses[0].id));
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, []);


  async function loadPaymentInstruction(orderId: string) {
    setInstructionLoading(true);
    setInstructionError("");

    try {
      const instruction =
        await getMemberOrderPaymentInstruction(orderId);

      setPaymentInstruction(instruction);
    } catch (error) {
      setInstructionError(
        error instanceof Error
          ? error.message
          : "GET_PAYMENT_INSTRUCTION_FAILED",
      );
    } finally {
      setInstructionLoading(false);
    }
  }



  async function handleCheckout() {
    if (!accountId || !selectedAddressId) {
      setPageError("Vui lòng chọn địa chỉ nhận hàng trước khi đặt hàng.");
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setPageError("");

    try {
      const order = await checkoutMemberCart(accountId, {
        addressId: selectedAddressId,
        paymentMethod,
      });

      const orderId = String(order.id);

      setSuccessOrderId(orderId);
      setSuccessPaymentMethod(paymentMethod);

      if (paymentMethod === "BANK_TRANSFER") {
        await loadPaymentInstruction(orderId);
      }
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }


  if (loading) {
    return (
      <main className="member-checkout-page">
        <div className="member-checkout-state">
          Đang tải thông tin thanh toán...
        </div>
      </main>
    );
  }

  if (successOrderId) {
    return (
      <main className="member-checkout-page">
        <section className="member-checkout-success">
          <div className="member-checkout-success-icon">✓</div>

          <h1>ĐẶT HÀNG THÀNH CÔNG</h1>

          <p>
            Đơn hàng của bạn đã được tạo thành công.
          </p>

          <p className="member-checkout-order-id">
            Mã đơn hàng: {successOrderId}
          </p>


          {successPaymentMethod === "BANK_TRANSFER" && (
            <section className="member-checkout-transfer">
              <h2>THÔNG TIN CHUYỂN KHOẢN</h2>

              <p>
                Đơn hàng đang chờ thanh toán. Vui lòng chuyển khoản
                đúng số tiền và nội dung bên dưới.
              </p>

              {instructionLoading && (
                <p>Đang tải thông tin chuyển khoản...</p>
              )}

              {instructionError && (
                <div className="member-checkout-error" role="alert">
                  <p>
                    Không tải được hướng dẫn chuyển khoản.
                    Đơn hàng đã được tạo, vui lòng thử tải lại.
                  </p>

                  <button
                    type="button"
                    disabled={instructionLoading}
                    onClick={() => void loadPaymentInstruction(successOrderId)}
                  >
                    THỬ LẠI
                  </button>
                </div>
              )}

              {paymentInstruction && (
                <>
                  <div>
                    <span>Ngân hàng</span>
                    <strong>Tài khoản ngân hàng cửa hàng</strong>
                  </div>

                  <div>
                    <span>Số tài khoản</span>
                    <strong>
                      {paymentInstruction.bankAccount?.accountNumber
                        || "Chưa có thông tin tài khoản"}
                    </strong>
                  </div>

                  <div>
                    <span>Số tiền cần chuyển</span>
                    <strong>
                      {Number(paymentInstruction.expectedAmount).toLocaleString(
                        "vi-VN",
                      )}{" "}
                      VNĐ
                    </strong>
                  </div>

                  <div>
                    <span>Nội dung chuyển khoản</span>
                    <strong>{paymentInstruction.transferContent}</strong>
                  </div>

                  <div>
                    <span>Trạng thái hướng dẫn</span>
                    <strong>
                      {paymentInstruction.status === "WAITING"
                        ? "Đang chờ thanh toán"
                        : paymentInstruction.status === "PARTIALLY_PAID"
                          ? "Đã nhận một phần tiền"
                          : paymentInstruction.status}
                    </strong>
                  </div>

                  <div>
                    <span>Hạn thanh toán</span>
                    <strong>
                      {new Date(paymentInstruction.expiresAt).toLocaleString(
                        "vi-VN",
                      )}
                    </strong>
                  </div>

                  <p>
                    Hướng dẫn chuyển khoản có hiệu lực trong 10 phút
                    kể từ thời điểm tạo. Hãy kiểm tra trạng thái đơn
                    hàng sau khi chuyển khoản.
                  </p>
                </>
              )}
            </section>
          )}


          <div className="member-checkout-success-actions">
            <Link to="/member" className="member-checkout-primary-button">
              VỀ TÀI KHOẢN
            </Link>

            <Link to="/products" className="member-checkout-secondary-button">
              TIẾP TỤC MUA SẮM
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="member-checkout-page">
      <div className="member-checkout-container">
        <div className="member-checkout-breadcrumb">
          <Link to="/products">Sản phẩm</Link>
          <span>/</span>
          <Link to="/member/cart">Giỏ hàng</Link>
          <span>/</span>
          <span>Thanh toán</span>
        </div>

        <header className="member-checkout-header">
          <h1>THANH TOÁN</h1>
          <p>Kiểm tra địa chỉ nhận hàng và phương thức thanh toán.</p>
        </header>

        {pageError && (
          <div className="member-checkout-error" role="alert">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        <div className="member-checkout-layout">
          <section className="member-checkout-main">
            <div className="member-checkout-section">
              <div className="member-checkout-section-heading">
                <div>
                  <span className="member-checkout-step">01</span>
                  <h2>ĐỊA CHỈ NHẬN HÀNG</h2>
                </div>

                <Link to="/member" className="member-checkout-manage-link">
                  Quản lý địa chỉ
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="member-checkout-empty-address">
                  <p>Bạn chưa có địa chỉ nhận hàng.</p>
                  <Link to="/member">
                    Đi đến tài khoản để quản lý địa chỉ
                  </Link>
                </div>
              ) : (
                <div className="member-checkout-address-list">
                  {addresses.map((address) => (
                    <label
                      key={String(address.id)}
                      className={`member-checkout-address-card ${selectedAddressId === String(address.id)
                        ? "is-selected"
                        : ""
                        }`}
                    >
                      <input
                        type="radio"
                        name="checkout-address"
                        value={String(address.id)}
                        checked={selectedAddressId === String(address.id)}
                        onChange={(event) =>
                          setSelectedAddressId(event.target.value)
                        }
                      />

                      <div className="member-checkout-address-content">
                        <div className="member-checkout-address-top">
                          <strong>{address.receiverName}</strong>
                          <span>{address.phone}</span>

                          {address.isDefault && (
                            <span className="member-checkout-default-badge">
                              Mặc định
                            </span>
                          )}
                        </div>

                        <p>{address.addressLine}</p>

                        <p>
                          {[address.ward, address.district, address.province]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="member-checkout-section">
              <div className="member-checkout-section-heading">
                <div>
                  <span className="member-checkout-step">02</span>
                  <h2>PHƯƠNG THỨC THANH TOÁN</h2>
                </div>
              </div>

              <div className="member-checkout-payment-list">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`member-checkout-payment-card ${paymentMethod === method.value ? "is-selected" : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="checkout-payment"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                    />

                    <div>
                      <strong>{method.label}</strong>
                      <p>{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <aside className="member-checkout-summary">
            <h2>HOÀN TẤT ĐƠN HÀNG</h2>

            <p className="member-checkout-summary-description">
              Đơn hàng sẽ được tính tiền và kiểm tra tồn kho trên hệ thống
              trước khi xác nhận tạo đơn.
            </p>

            <div className="member-checkout-summary-notice">
              <strong>Lưu ý</strong>
              <p>
                Phí vận chuyển, ưu đãi và tổng tiền chính thức sẽ do hệ thống
                xác định. Với thanh toán bằng ví, số dư sẽ được kiểm tra khi
                đặt hàng.
              </p>
            </div>

            <button
              type="button"
              className="member-checkout-primary-button member-checkout-submit"
              disabled={
                submitting ||
                addresses.length === 0 ||
                !selectedAddressId ||
                !accountId
              }
              onClick={() => void handleCheckout()}
            >
              {submitting ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐẶT HÀNG"}
            </button>

            <Link
              to="/member/cart"
              className="member-checkout-back-link"
              onClick={(event) => {
                if (submitting) {
                  event.preventDefault();
                }
              }}
            >
              ← Quay lại giỏ hàng
            </Link>

            <p className="member-checkout-secure-note">
              Đơn hàng chỉ được xác nhận khi hệ thống xử lý thành công.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
