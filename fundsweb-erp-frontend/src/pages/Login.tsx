import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Fundsweb ERP</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          placeholder="admin@fundsweb.test"
          required
        />

        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          placeholder="••••••••"
          required
        />

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-dark)",
  },
  card: {
    background: "var(--bg-card)",
    padding: "40px",
    borderRadius: "12px",
    width: "360px",
    border: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--accent)",
    marginBottom: "4px",
  },
  subtitle: {
    color: "var(--text-muted)",
    marginBottom: "24px",
    fontSize: "14px",
  },
  label: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "6px",
    marginTop: "12px",
  },
  input: {
    background: "#12141a",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "var(--text-light)",
    fontSize: "14px",
  },
  button: {
    marginTop: "24px",
    background: "var(--accent)",
    color: "#12141a",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 600,
    fontSize: "15px",
  },
  error: {
    background: "#3a1f1f",
    color: "#ff8080",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px",
  },
};