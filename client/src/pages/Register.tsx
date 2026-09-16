import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", mobile: "", password: "" });
  const register = trpc.applicantAuth.register.useMutation({
    onSuccess: () => navigate("/login?registered=1"),
  });

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register.mutate(form);
  };

  return (
    <AuthLayout
      eyebrow="Create applicant account"
      title="Your next chapter starts here."
      description="Register with the contact details you will use throughout your admission journey."
      alternate={
        <span>
          Already have an account? <Link href="/login" className="font-semibold text-[#07563f] underline decoration-[#f2d313] decoration-2 underline-offset-4">Sign in</Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {register.error && (
          <div className="rounded-xl border border-[#e7b2aa] bg-[#fff5f2] px-4 py-3 text-sm leading-5 text-[#8e3b32]" role="alert">
            {displayError(register.error.message)}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="register-email">Email address</Label>
          <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required aria-invalid={Boolean(register.error)} className="h-12 rounded-xl border-[#d5ded8] bg-white px-4 shadow-none" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-mobile">Mobile number</Label>
          <Input id="register-mobile" name="mobile" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX" value={form.mobile} onChange={update("mobile")} required className="h-12 rounded-xl border-[#d5ded8] bg-white px-4 shadow-none" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="register-password">Password</Label>
            <span className="text-xs text-[#7b8889]">8–128 characters</span>
          </div>
          <Input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Create a strong password" value={form.password} onChange={update("password")} required minLength={8} maxLength={128} className="h-12 rounded-xl border-[#d5ded8] bg-white px-4 shadow-none" />
        </div>

        <Button type="submit" disabled={register.isPending} className="h-12 w-full rounded-xl bg-[#087f5b] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,127,91,0.18)] hover:bg-[#07563f]">
          {register.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {register.isPending ? "Creating account…" : "Create applicant account"}
        </Button>
        <p className="text-center text-xs leading-5 text-[#7b8889]">By continuing, you are creating an applicant profile for Carlos Hilado Memorial State University.</p>
      </form>
    </AuthLayout>
  );
}
