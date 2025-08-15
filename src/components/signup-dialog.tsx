import React from "react";
import ReactDOM from "react-dom"; // Import ReactDOM for Portals
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-203f6a42`;

export function SignupDialog() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      toast.success("Account created. You can sign in now.");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        Sign Up
      </button>

      {open && ReactDOM.createPortal(
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Account</h3>
              <button className="btn icon-btn" onClick={() => setOpen(false)}>X</button>
            </div>
            <form onSubmit={onSignup} className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input id="signup-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input id="signup-password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>Create Account</button>
                <button className="btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}