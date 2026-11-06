import type { PageId } from "../types";
import { runWindow } from "../window";

const ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" },
  { id: "performance", label: "Performance", icon: "M4 16h3l2-6 3 8 2-5h6" },
  { id: "cooling", label: "Cooling", icon: "M12 4v16M12 12l6-3.5M12 12l6 3.5M12 12l-6 3.5M12 12 6 8.5" },
  { id: "electrical", label: "Electrical", icon: "M13 3 6 13h5l-1 8 8-12h-5z" },
  { id: "storage", label: "Storage", icon: "M5 7h14v4H5zM5 13h14v4H5zM8 9h.01M8 15h.01" },
  { id: "sensors", label: "Sensors", icon: "M5 7h14M5 12h14M5 17h14" },
  {
    id: "settings",
    label: "Settings",
    icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2.2M12 19.3V21.5M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6",
  },
];

type NavProps = {
  page: PageId;
  onChange: (page: PageId) => void;
};

export function Nav({ page, onChange }: NavProps) {
  return (
    <aside className="rail">
      <div className="brand">
        <img className="brand-icon" src="/brand.png" alt="" />
        <span>
          <strong>Mithraic</strong>
          <small>HW Monitor</small>
        </span>
      </div>
      <nav className="nav" aria-label="Sections">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={page === item.id ? "nav-button active" : "nav-button"}
            aria-current={page === item.id ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>
      <button type="button" className="rail-close" onClick={() => void runWindow("close")}>
        Close
      </button>
    </aside>
  );
}
