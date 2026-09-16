import { useEffect } from "react";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, FileText, Headphones, LockKeyhole, LogOut, Megaphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { DASHBOARD_CONFIG } from "@/config/dashboard";

const statusStyles = {
  Pending: "border-[#e5c98d] bg-[#fff8e8] text-[#8d6418]",
  Approved: "border-[#afd2c4] bg-[#effaf5] text-[#28604f]",
  Rejected: "border-[#e7b2aa] bg-[#fff5f2] text-[#8e3b32]",
  Waitlisted: "border-[#c5c8e6] bg-[#f4f4ff] text-[#4d528c]",
  "Not started": "border-[#d5ded8] bg-[#f5f7f4] text-[#617077]",
} as const;

type StatusLabel = keyof typeof statusStyles;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const applicant = trpc.applicantAuth.me.useQuery();
  const logout = trpc.applicantAuth.logout.useMutation({
    onSuccess: () => navigate("/login"),
  });

  useEffect(() => {
    if (!applicant.isLoading && !applicant.data) navigate("/login");
  }, [applicant.data, applicant.isLoading, navigate]);

  if (applicant.isLoading || !applicant.data) {
    return <DashboardSkeleton />;
  }

  const status = (applicant.data.currentAdmissionStatus ?? "Not started") as StatusLabel;
  const admissionApproved = status === "Approved";
  const firstName = applicant.data.email?.split("@")[0] ?? "Applicant";

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#15232d]">
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-[#dce2dc] pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#102b3a] text-[#f0c36b]"><ShieldCheck className="size-5" /></span>
            <div>
              <p className="text-sm font-bold tracking-tight text-[#102b3a]">Student Admissions</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7b8889]">Applicant portal</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending} className="gap-2 text-[#65747a] hover:bg-white hover:text-[#102b3a]">
            <LogOut className="size-4" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </header>

        <section className="py-10 lg:py-14">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#a26b18]">Applicant dashboard</p>
              <h1 className="font-serif text-4xl leading-tight tracking-[-0.04em] text-[#102b3a] sm:text-5xl">Good morning, {firstName}.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#65747a]">Everything you need for your admission journey, in one clear view.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#7b8889]"><Bell className="size-4 text-[#a26b18]" /> Keep your details close</div>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-2xl bg-[#102b3a] p-7 text-white shadow-[0_18px_40px_rgba(16,43,58,0.13)] sm:p-8">
              <div className="absolute -right-16 -top-20 size-56 rounded-full border border-[#7eb7a8]/20" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-12">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-[#f0c36b] text-[#102b3a]"><FileText className="size-6" /></div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{status}</span>
                </div>
                <div>
                  <h2 className="font-serif text-3xl tracking-[-0.03em]">Admission Application</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#c7d5d3]">{status === "Not started" ? "Begin your application when you are ready. Your progress will be saved to your applicant profile." : "Your latest admission application status is shown above. Check back here for the next update."}</p>
                  <Button onClick={() => navigate("/admission-application")} className="mt-6 gap-2 rounded-xl bg-[#f0c36b] text-[#102b3a] hover:bg-[#f6d58f]"><ArrowRight className="size-4" /> Start Application</Button>
                </div>
              </div>
            </article>

            <article className={`rounded-2xl border p-7 shadow-[0_12px_30px_rgba(21,35,45,0.04)] sm:p-8 ${admissionApproved ? "border-[#afd2c4] bg-[#effaf5]" : "border-[#dce2dc] bg-white"}`}>
              <div className="flex h-full flex-col justify-between gap-12">
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid size-12 place-items-center rounded-xl ${admissionApproved ? "bg-[#b8dbc9] text-[#1c5949]" : "bg-[#e8ece7] text-[#718087]"}`}>
                    {admissionApproved ? <CheckCircle2 className="size-6" /> : <LockKeyhole className="size-6" />}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${admissionApproved ? statusStyles.Approved : "border-[#d5ded8] bg-[#f5f7f4] text-[#617077]"}`}>{admissionApproved ? "Available" : "Locked"}</span>
                </div>
                <div>
                  <h2 className="font-serif text-3xl tracking-[-0.03em] text-[#102b3a]">Online Enrollment</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#65747a]">{admissionApproved ? "Your admission is approved. You may continue to enrollment when the enrollment window opens." : "Online enrollment unlocks automatically after your admission application is approved."}</p>
                  <Button disabled={!admissionApproved} onClick={() => admissionApproved && navigate("/enrollment")} variant={admissionApproved ? "default" : "outline"} className={`mt-6 gap-2 rounded-xl ${admissionApproved ? "bg-[#102b3a] text-white hover:bg-[#1d4558]" : "border-[#d5ded8] text-[#899493]"}`}>
                    {admissionApproved ? <ArrowRight className="size-4" /> : <LockKeyhole className="size-4" />}
                    {admissionApproved ? "Continue to enrollment" : "Locked until approval"}
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 border-y border-[#dce2dc] py-7 md:grid-cols-3">
          <InfoCard icon={<CalendarDays className="size-5" />} label={DASHBOARD_CONFIG.enrollmentPeriod.label} value={DASHBOARD_CONFIG.enrollmentPeriod.value} detail={DASHBOARD_CONFIG.enrollmentPeriod.detail} />
          <InfoCard icon={<Clock3 className="size-5" />} label={DASHBOARD_CONFIG.examSchedule.label} value={DASHBOARD_CONFIG.examSchedule.value} detail={DASHBOARD_CONFIG.examSchedule.detail} />
          <InfoCard icon={<Headphones className="size-5" />} label={DASHBOARD_CONFIG.hotline.label} value={DASHBOARD_CONFIG.hotline.value} detail={DASHBOARD_CONFIG.hotline.detail} />
        </section>

        <section className="py-10 lg:py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#a26b18]">Stay in the loop</p>
              <h2 className="font-serif text-3xl tracking-[-0.03em] text-[#102b3a]">Announcements</h2>
            </div>
            <Megaphone className="size-5 text-[#a26b18]" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {DASHBOARD_CONFIG.announcements.map(announcement => (
              <article className="rounded-2xl border border-[#dce2dc] bg-white p-6" key={announcement.title}>
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#a26b18]"><span>{announcement.tag}</span><span className="text-[#96a19f]">{announcement.date}</span></div>
                <h3 className="mt-5 text-base font-semibold leading-6 text-[#102b3a]">{announcement.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#65747a]">{announcement.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[#dce2dc] bg-white p-5">
      <div className="flex items-center gap-3 text-[#a26b18]"><span className="grid size-9 place-items-center rounded-lg bg-[#fff8e8]">{icon}</span><span className="text-xs font-bold uppercase tracking-[0.14em] text-[#718087]">{label}</span></div>
      <p className="mt-5 text-lg font-semibold tracking-tight text-[#102b3a]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#7b8889]">{detail}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return <main className="min-h-screen bg-[#f6f7f2] p-6"><div className="mx-auto max-w-[1280px] animate-pulse space-y-8"><div className="h-12 rounded-xl bg-[#e4e9e3]" /><div className="h-36 rounded-2xl bg-[#e4e9e3]" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-72 rounded-2xl bg-[#dbe5e0]" /><div className="h-72 rounded-2xl bg-[#e4e9e3]" /></div></div></main>;
}
