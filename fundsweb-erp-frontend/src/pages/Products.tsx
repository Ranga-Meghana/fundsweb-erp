import { useEffect, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", unitPrice: "", minStockAlert: "0" });
  const [error, setError] = useState("");

  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [stockError, setStockError] = useState("");

  const loadProducts = () => {
    api.get("/products").then((res) => setProducts(res.data.products || res.data));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/products", {
        name: form.name,
        sku: form.sku,
        category: form.category || undefined,
        unitPrice: parseFloat(form.unitPrice),
        minStockAlert: parseInt(form.minStockAlert) || 0,
      });
      setShowForm(false);
      setForm({ name: "", sku: "", category: "", unitPrice: "", minStockAlert: "0" });
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create product");
    }
  };

  const openStockModal = (product: Product) => {
    setStockModalProduct(product);
    setMovementType("IN");
    setQuantity("1");
    setReason("");
    setStockError("");
  };

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    setStockError("");
    try {
      await api.post(`/products/${stockModalProduct.id}/stock-movement`, {
        movementType,
        quantityChanged: parseInt(quantity),
        reason: reason || (movementType === "IN" ? "Stock added" : "Stock removed"),
      });
      setStockModalProduct(null);
      loadProducts();
    } catch (err: any) {
      setStockError(err.response?.data?.error || "Failed to update stock");
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1>Products</h1>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} required />
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={styles.input} required />
          <input placeholder="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input} />
          <input placeholder="Unit Price" type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} style={styles.input} required />
          <input placeholder="Minimum Stock Alert" type="number" value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} style={styles.input} />
          <button type="submit" style={styles.submitBtn}>Save Product</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category || "-"}</td>
                <td>₹{Number(p.unitPrice).toFixed(2)}</td>
                <td style={{ color: p.currentStock <= p.minStockAlert ? "#ff8080" : "var(--text-light)", fontWeight: p.currentStock <= p.minStockAlert ? 700 : 400 }}>
                  {p.currentStock}
                </td>
                <td>
                  <button onClick={() => openStockModal(p)} style={styles.smallBtn}>Adjust Stock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockModalProduct && (
        <div style={styles.overlay}>
          <form onSubmit={handleStockMovement} style={styles.modal}>
            <h3 style={{ marginBottom: "12px" }}>Adjust Stock — {stockModalProduct.name}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
              Current stock: {stockModalProduct.currentStock}
            </p>

            {stockError && <div style={styles.error}>{stockError}</div>}

            <select value={movementType} onChange={(e) => setMovementType(e.target.value as "IN" | "OUT")} style={styles.input}>
              <option value="IN">Stock IN (add stock)</option>
              <option value="OUT">Stock OUT (remove stock)</option>
            </select>

            <input
              type="number"
              min={1}
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={styles.input}
              required
            />

            <input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={styles.input}
            />

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button type="submit" style={styles.submitBtn}>Confirm</button>
              <button type="button" onClick={() => setStockModalProduct(null)} style={styles.secondaryBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  addBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 600 },
  form: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#12141a", color: "var(--text-light)" },
  submitBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 600 },
  secondaryBtn: { background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-light)", borderRadius: "8px", padding: "10px", flex: 1 },
  error: { background: "#3a1f1f", color: "#ff8080", padding: "10px", borderRadius: "6px", fontSize: "13px" },
  smallBtn: { background: "var(--accent)", color: "#12141a", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", width: "360px", display: "flex", flexDirection: "column", gap: "10px" },
};