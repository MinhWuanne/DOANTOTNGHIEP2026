
import { Link } from "react-router-dom";

export default function StorefrontFooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-main">
        <div className="home-footer-brand">
          <Link to="/" className="home-logo home-footer-logo">
            ICON<span>DENIM</span>
            <small>YOUR EVERYDAY STYLE</small>
          </Link>

          <p className="home-footer-description">
            Thời trang cho phong cách riêng.
            <br />
            Denim cho mỗi ngày.
          </p>

          <div className="home-footer-contact">
            <span className="home-footer-contact-label">
              CHĂM SÓC KHÁCH HÀNG
            </span>
            <span>Email hỗ trợ</span>
            <span>Thông tin liên hệ sẽ được cập nhật</span>
          </div>
        </div>

        <div className="home-footer-newsletter">
          <span className="home-footer-eyebrow">STAY IN STYLE</span>
          <h2>ĐĂNG KÝ NHẬN TIN</h2>
          <p>
            Khám phá bộ sưu tập mới và cập nhật những ưu đãi dành riêng cho bạn.
          </p>
          <span className="home-footer-newsletter-note">
            Ưu đãi và tin tức mới nhất từ ICONDENIM.
          </span>
        </div>


        <div className="home-footer-column">
          <h2>HỖ TRỢ KHÁCH HÀNG</h2>
          <span className="home-coming-soon-item">
            Hướng dẫn mua hàng
            <small className="home-coming-soon-badge">Coming soon</small>
          </span>
          <span className="home-coming-soon-item">
            Chính sách giao hàng
            <small className="home-coming-soon-badge">Coming soon</small>
          </span>
          <span className="home-coming-soon-item">
            Chính sách đổi trả
            <small className="home-coming-soon-badge">Coming soon</small>
          </span>
          <span className="home-coming-soon-item">
            Phương thức thanh toán
            <small className="home-coming-soon-badge">Coming soon</small>
          </span>
        </div>

        <div className="home-footer-column">
          <h2>KHÁM PHÁ</h2>
          <Link to="/products">Tất cả sản phẩm</Link>
          <Link to="/products">Hàng mới</Link>
          <Link to="/products">Sản phẩm bán chạy</Link>
        </div>

      </div>

      <div className="home-footer-service">
        <div className="home-footer-service-item">
          <span className="home-footer-service-number">01</span>
          <div>
            <h3>PHONG CÁCH RIÊNG</h3>
            <p>Định hình chất riêng mỗi ngày.</p>
          </div>
        </div>

        <div className="home-footer-service-item">
          <span className="home-footer-service-number">02</span>
          <div>
            <h3>TRẢI NGHIỆM MUA SẮM</h3>
            <p>Thông tin sản phẩm rõ ràng.</p>
          </div>
        </div>

        <div className="home-footer-service-item">
          <span className="home-footer-service-number">03</span>
          <div>
            <h3>ĐỒNG HÀNH CÙNG BẠN</h3>
            <p>Hỗ trợ trong quá trình mua hàng.</p>
          </div>
        </div>
      </div>

      <div className="home-footer-bottom">
        <p>© 2026 ICONDENIM. ALL RIGHTS RESERVED.</p>
        <p className="home-footer-bottom-note">
          BUILT AROUND YOUR EVERYDAY STYLE.
        </p>
      </div>
    </footer>
  );
}
