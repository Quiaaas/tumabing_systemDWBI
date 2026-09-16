import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import AuthLayout from "./AuthLayout";

function displayError(message?: string) {
  if (!message) return "Something went wrong. Please try again.";
  try {
    const issues = JSON.parse(message) as Array<{ message?: string }>;
    if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
  } catch {
    // The backend already returned a human-readable message.
  }
  return message;
}

export default function Login() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showRegistered, setShowRegistered] = useState(false);
  const login = trpc.applicantAuth.login.useMutation({
    onSuccess: () => navigate("/dashboard"),
  });

  useEffect(() => {
    setShowRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
  }, []);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(form);
  };

  return (
    <AuthLayout
      eyebrow="Applicant sign in"
      title="Welcome back."
      description="Sign in to continue your admission journey with the details you registered."
      alternate={
        <span>
          New applicant? <Link href="/register" className="font-semibold text-[#07563f] underline decoration-[#f2d313] decoration-2 underline-offset-4">Create an account</Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {showRegistered && (
          <div className="flex items-start gap-3 rounded-xl border border-[#afd2c4] bg-[#f0faf5] px-4 py-3 text-sm leading-5 text-[#28604f]" role="status">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Your account is ready. Sign in to continue.
          </div>
        )}
        {login.error && (
          <div className="rounded-xl border border-[#e7b2aa] bg-[#fff5f2] px-4 py-3 text-sm leading-5 text-[#8e3b32]" role="alert">
            {displayError(login.error.message)}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required aria-invalid={Boolean(login.error)} className="h-12 rounded-xl border-[#d5ded8] bg-white px-4 shadow-none" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <span className="text-xs text-[#7b8889]">Your private key</span>
          </div>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={update("password")} required minLength={8} maxLength={128} className="h-12 rounded-xl border-[#d5ded8] bg-white px-4 shadow-none" />
        </div>

        <Button type="submit" disabled={login.isPending} className="h-12 w-full rounded-xl bg-[#07563f] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(16,43,58,0.18)] hover:bg-[#087f5b]">
          {login.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs leading-5 text-[#7b8889]">Your session is secured with an encrypted, httpOnly cookie.</p>
      </form>
    </AuthLayout>
  );
}
