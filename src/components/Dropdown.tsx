import { useEffect } from "react";
import type { ReactNode } from "react";

interface DropdownProps {
  open: boolean;
  onClose: () => void;
  /** 'up' — панель раскрывается над кнопкой (кнопки внизу сайдбара), 'down' — под кнопкой */
  direction?: "up" | "down";
  align?: "start" | "end";
  width?: number;
  children: ReactNode;
}

/**
 * Аккуратное всплывающее меню: рисуется с отступом от кнопки,
 * с тенью, рамкой и «стрелкой», не обрезается краями контейнера
 * (у сайдбара overflow: visible, z-index выше контента).
 */
export default function Dropdown({
  open,
  onClose,
  direction = "up",
  align = "start",
  width = 252,
  children,
}: DropdownProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const origin =
    direction === "up"
      ? align === "start"
        ? "bottom left"
        : "bottom right"
      : align === "start"
        ? "top left"
        : "top right";

  return (
    <>
      {/* невидимая подложка: клик вне меню закрывает его */}
      <div className="fixed inset-0 z-40 cursor-default" onMouseDown={onClose} />
      <div
        className={`absolute z-50 ${
          direction === "up" ? "bottom-full mb-2.5" : "top-full mt-2.5"
        } ${align === "start" ? "left-0" : "right-0"}`}
        style={{ width, transformOrigin: origin }}
      >
        <div
          className="animate-pop relative rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2"
          style={{ boxShadow: "var(--shadow)" }}
        >
          {children}
          {/* стрелка, указывающая на кнопку */}
          <span
            className={`absolute h-3 w-3 rotate-45 border-[var(--line)] bg-[var(--panel-2)] ${
              direction === "up"
                ? "-bottom-[7px] border-b border-r"
                : "-top-[7px] border-l border-t"
            } ${align === "start" ? "left-7" : "right-7"}`}
          />
        </div>
      </div>
    </>
  );
}
