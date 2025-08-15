import React from "react";
import ReactDOM from "react-dom"; // Import ReactDOM for Portals
import { toast } from "sonner";
import { supabase } from "./supabase-client";

function useSession() {
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return userEmail;
}

export function AuthBar() {
  const email = useSession();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", password: "" });
  const [loading, setLoading] = React.useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(form);
      if (error) throw error;
      toast.success("Signed in");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <>
      {email ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p>Signed in as {email}</p>
          <button className="btn" onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button className="btn" onClick={() => setOpen(true)}>
          Sign In
        </button>
      )}

      {open && !email && ReactDOM.createPortal(
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Sign In</h3>
              <button className="btn icon-btn" onClick={() => setOpen(false)}>X</button>
            </div>
            <form onSubmit={signIn} className="form-grid">
              <div className="form-group">
                <label htmlFor="signin-email">Email</label>
                <input id="signin-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label htmlFor="signin-password">Password</label>
                <input id="signin-password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>Sign In</button>
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