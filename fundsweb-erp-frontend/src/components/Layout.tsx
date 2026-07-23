import type { ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function CustomersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M15.5 13.2c2.9.4 5 2.9 5 6.3" />
    </svg>
  );
}
function ProductsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 7.5v9L12 21l9-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  );
}
function ChallansIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M15 2v4h4" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/customers", label: "Customers", icon: <CustomersIcon /> },
    { path: "/products", label: "Products", icon: <ProductsIcon /> },
    { path: "/challans", label: "Challans", icon: <ChallansIcon /> },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>Fundsweb</h2>
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navLink,
                  background: active ? "rgba(212, 162, 78, 0.12)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-light)",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={styles.userBox}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {user?.name} <span style={styles.roleTag}>{user?.role}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogoutIcon /> Logout
          </button>
        </div>
      </aside>
      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: "230px",
    background: "var(--bg-card)",
    borderRight: "1px solid var(--border-color)",
    padding: "28px 18px",
    display: "flex",
    flexDirection: "column",
  },
  logo: { color: "var(--accent)", marginBottom: "36px", fontSize: "20px", letterSpacing: "0.5px" },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "11px 14px",
    borderRadius: "8px",
    textDecoration: "none",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 500,
    transition: "background 0.15s ease",
  },
  navIcon: { display: "flex", alignItems: "center" },
  userBox: { borderTop: "1px solid var(--border-color)", paddingTop: "18px" },
  roleTag: { display: "inline-block", marginLeft: "4px", fontSize: "10px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.5px" },
  logoutBtn: {
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "1px solid var(--border-color)",
    color: "var(--text-muted)",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "13px",
    width: "100%",
    justifyContent: "center",
  },
  content: { flex: 1, padding: "36px", background: "var(--bg-dark)" },
};