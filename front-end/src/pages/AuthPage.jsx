import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function AuthPage({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Email ve şifre zorunludur.");
      return;
    }
    if (mode === "register" && form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.name);
      }
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.hata || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="auth-modal">
        <button className="auth-modal__close" onClick={onClose}>
          <span className="ms">close</span>
        </button>

        <div className="auth-modal__brand">
          <span className="auth-modal__logo">🏔️</span>
          <span className="auth-modal__brand-name">Kapadokya El Sanatları</span>
        </div>

        <div className="auth-modal__tabs">
          <button
            className={`auth-tab${mode === "login" ? " auth-tab--active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Giriş Yap
          </button>
          <button
            className={`auth-tab${mode === "register" ? " auth-tab--active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Kayıt Ol
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Ad Soyad</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Adınız Soyadınız"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={60}
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email <span className="auth-req">*</span></label>
            <input
              className="auth-input"
              type="email"
              placeholder="ornek@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Şifre <span className="auth-req">*</span></label>
            <input
              className="auth-input"
              type="password"
              placeholder={mode === "register" ? "En az 6 karakter" : "Şifreniz"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Lütfen bekleyin..."
              : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
          <button
            className="auth-switch__link"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Kayıt Ol" : "Giriş Yap"}
          </button>
        </p>
      </div>
    </div>
  );
}
