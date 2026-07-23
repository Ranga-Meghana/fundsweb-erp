import { useEffect, useState } from "react";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import Layout from "../components/Layout";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  customerType: string;
  status: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    businessName: "",
    customerType: "RETAIL",
  });
  const [error, setError] = useState("");

  const loadCustomers = () => {
    api.get("/customers", { params: { search } }).then((res) => setCustomers(res.data.customers));
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/customers", form);
      setShowForm(false);
      setForm({ name: "", mobile: "", email: "", businessName: "", customerType: "RETAIL" });
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create customer");
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1>Customers</h1>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Customer"}
        </button>
      </div>

      <input
        placeholder="Search by name, business, mobile..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={styles.input}
            required
          />
          <input
            placeholder="Mobile"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            style={styles.input}
            required
          />
          <input
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="Business Name (optional)"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            style={styles.input}
          />
          <select
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value })}
            style={styles.input}
          >
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <button type="submit" style={styles.submitBtn}>Save Customer</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.mobile}</td>
                <td>{c.businessName || "-"}</td>
                <td>{c.customerType}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  addBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 600 },
  search: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-light)", marginBottom: "20px" },
  form: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#12141a", color: "var(--text-light)" },
  submitBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 600, marginTop: "8px" },
  error: { background: "#3a1f1f", color: "#ff8080", padding: "10px", borderRadius: "6px", fontSize: "13px" },
};