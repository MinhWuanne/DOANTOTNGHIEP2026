import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useDemoClock } from "../../context/DemoClockContext";

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function DemoClock() {
  const {
    demoTime,
    addHours,
    setDemoTime,
    resetToRealTime,
  } = useDemoClock();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    toDateTimeLocalValue(demoTime),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener(
        "mousedown",
        handlePointerDown,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
    };
  }, [open]);

  function handleToggleOpen() {
    setOpen((current) => {
      const next = !current;

      if (next) {
        setInputValue(toDateTimeLocalValue(demoTime));
      }

      return next;
    });
  }

  function handleApply() {
    const next = new Date(inputValue);

    if (Number.isNaN(next.getTime())) {
      return;
    }

    setDemoTime(next);
    setOpen(false);
  }

  function handleQuickAdd(hours: number) {
    addHours(hours);
  }

  function handleReset() {
    resetToRealTime();
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="admin-demo-clock"
    >
      <button
        type="button"
        className="admin-demo-clock-button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span
          className="admin-demo-clock-icon"
          aria-hidden="true"
        >
          🕒
        </span>

        <span className="admin-demo-clock-label">
          Demo:
        </span>

        <strong>
          {formatDisplayDate(demoTime)}
        </strong>
      </button>

      {open && (
        <div
          className="admin-demo-clock-popover"
          role="dialog"
          aria-label="Demo Clock"
        >
          <div className="admin-demo-clock-popover-header">
            <div>
              <span className="admin-demo-clock-eyebrow">
                DEMO CLOCK
              </span>

              <strong>
                Thời gian hệ thống demo
              </strong>
            </div>
          </div>

          <div className="admin-demo-clock-current">
            {formatDisplayDate(demoTime)}
          </div>

          <div className="admin-demo-clock-section">
            <span className="admin-demo-clock-section-title">
              Tăng thời gian
            </span>

            <div className="admin-demo-clock-quick-actions">
              <button
                type="button"
                onClick={() => handleQuickAdd(1)}
              >
                +1 giờ
              </button>

              <button
                type="button"
                onClick={() => handleQuickAdd(24)}
              >
                +24 giờ
              </button>

              <button
                type="button"
                onClick={() => handleQuickAdd(72)}
              >
                +72 giờ
              </button>

              <button
                type="button"
                onClick={() => handleQuickAdd(120)}
              >
                +120 giờ
              </button>
            </div>
          </div>

          <div className="admin-demo-clock-section">
            <label
              htmlFor="admin-demo-clock-input"
              className="admin-demo-clock-section-title"
            >
              Đặt thời gian
            </label>

            <input
              id="admin-demo-clock-input"
              type="datetime-local"
              value={inputValue}
              onChange={(event) =>
                setInputValue(event.target.value)
              }
              className="admin-demo-clock-input"
            />

            <button
              type="button"
              className="admin-demo-clock-apply"
              onClick={handleApply}
            >
              Áp dụng
            </button>
          </div>

          <div className="admin-demo-clock-footer">
            <button
              type="button"
              className="admin-demo-clock-reset"
              onClick={handleReset}
            >
              Trở về thời gian thực
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemoClock;