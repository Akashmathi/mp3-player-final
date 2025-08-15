import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-203f6a42`;

export function SignupDialog() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });

  async function onSignup() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      toast.success("Account created. You can sign in now.");
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Sign up</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSignup} disabled={loading}>Create account</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          <p className="text-muted-foreground text-sm">For social login (Google), remember to enable the provider in your Supabase project settings.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
