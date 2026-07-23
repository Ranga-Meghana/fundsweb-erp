import { useEffect, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";

interface Summary {
  customers: { total: number; active: number };
  products: { total: number; lowStock: number };
  challans: { total: number; draft: number; confirmed: number };
  totalRevenue: number;
}

function IconWrap({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ ...styles.iconWrap, background: `${color}22`, color }}>{children}</div>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><p>Loading...</p></Layout>;
  if (!summary) return <Layout><p>Could not load dashboard.</p></Layout>;

  const stats = [
    { label: "Total Customers", value: summary.customers.total, color: "#6495ed", icon: "👥" },
    { label: "Active Customers", value: summary.customers.active, color: "#4caf50", icon: "✓" },
    { label: "Total Products", value: summary.products.total, color: "#d4a24e", icon: "📦" },
    { label: "Low Stock Items", value: summary.products.lowStock, color: "#ff8080", icon: "⚠" },
    { label: "Total Challans", value: summary.challans.total, color: "#9a9ea6", icon: "📄" },
    { label: "Confirmed Challans", value: summary.challans.confirmed, color: "#4caf50", icon: "✓" },
  ];

  return (
    <Layout>
      <h1 style={{ marginBottom: "28px" }}>Dashboard</h1>

      <div style={styles.revenueCard}>
        <div>
          <div style={styles.revenueLabel}>Total Revenue</div>
          <div style={styles.revenueValue}>₹{summary.totalRevenue.toFixed(2)}</div>
        </div>
        <div style={styles.revenueBadge}>💰</div>
      </div>

      <div style={styles.grid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.card}>
            <IconWrap color={s.color}>{s.icon}</IconWrap>
            <div style={styles.value}>{s.value}</div>
            <div style={styles.label}>{s.label}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  revenueCard: {
    background: "linear-gradient(135deg, var(--bg-card), #21252e)",
    border: "1px solid var(--border-color)",
    borderLeft: "4px solid var(--accent)",
    borderRadius: "14px",
    padding: "28px 32px",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueLabel: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" },
  revenueValue: { fontSize: "36px", fontWeight: 700, color: "var(--accent)" },
  revenueBadge: { fontSize: "32px", opacity: 0.7 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" },
  card: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px" },
  iconWrap: { width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginBottom: "12px" },
  value: { fontSize: "26px", fontWeight: 700, color: "var(--text-light)" },
  label: { fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" },
};