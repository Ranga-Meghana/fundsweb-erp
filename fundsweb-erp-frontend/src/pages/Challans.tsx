import { useEffect, useState } from "react";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import Layout from "../components/Layout";

interface Challan {
  id: string;
  challanNumber: string;
  customer: { name: string };
  totalQuantity: number;
  status: string;
}

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; unitPrice: number; }

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Challans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState("");

  const loadChallans = () => {
    api.get("/challans").then((res) => setChallans(res.data.challans || res.data));
  };

  useEffect(() => {
    loadChallans();
    api.get("/customers").then((res) => setCustomers(res.data.customers));
    api.get("/products").then((res) => setProducts(res.data.products || res.data));
  }, []);

  const addItemRow = () => setItems([...items, { productId: "", quantity: 1 }]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/challans", { customerId, items });
      setShowForm(false);
      setCustomerId("");
      setItems([{ productId: "", quantity: 1 }]);
      loadChallans();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create challan");
    }
  };

  const handleConfirm = async (id: string) => {
    setError("");
    try {
      await api.post(`/challans/${id}/confirm`);
      loadChallans();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to confirm challan");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/challans/${id}/cancel`);
      loadChallans();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel challan");
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1>Challans</h1>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Challan"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={styles.input} required>
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px" }}>
              <select
                value={item.productId}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx].productId = e.target.value;
                  setItems(newItems);
                }}
                style={{ ...styles.input, flex: 2 }}
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx].quantity = parseInt(e.target.value) || 1;
                  setItems(newItems);
                }}
                style={{ ...styles.input, flex: 1 }}
              />
            </div>
          ))}

          <button type="button" onClick={addItemRow} style={styles.secondaryBtn}>+ Add Item</button>
          <button type="submit" style={styles.submitBtn}>Create Draft Challan</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challans.map((c) => (
              <tr key={c.id}>
                <td>{c.challanNumber}</td>
                <td>{c.customer?.name}</td>
                <td>{c.totalQuantity}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  {c.status === "DRAFT" && (
                    <>
                      <button onClick={() => handleConfirm(c.id)} style={styles.smallBtn}>Confirm</button>
                      <button onClick={() => handleCancel(c.id)} style={styles.smallBtnCancel}>Cancel</button>
                    </>
                  )}
                  {c.status === "CONFIRMED" && (
                    <a href={`${API_BASE_URL}/challans/${c.id}/invoice`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                      Invoice
                    </a>
                  )}
                </td>
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
  form: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "500px" },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#12141a", color: "var(--text-light)" },
  submitBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 600, marginTop: "8px" },
  secondaryBtn: { background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-light)", borderRadius: "8px", padding: "8px" },
  error: { background: "#3a1f1f", color: "#ff8080", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" },
  smallBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", marginRight: "6px" },
  smallBtnCancel: { background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" },
};