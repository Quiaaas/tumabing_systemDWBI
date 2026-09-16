import { useEffect } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, FileText, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import { CHMSU_BRAND } from "@/config/brand";
import { trpc } from "@/lib/trpc";

type Status = "Pending" | "Approved" | "Rejected" | "Waitlisted";

const statusCopy: Record<Status, { title: string; description: string; className: string }> = {
  Pending: { title: "Application under review", description: "Your application was received and is waiting for review by the admissions office.", className: "border-[#e5c98d] bg-[#fff8e8] text-[#8d6418]" },
  Approved: { title: "Application approved", description: "Congratulations! Your admission application has been approved. Online enrollment is now available from your dashboard.", className: "border-[#afd2c4] bg-[#effaf5] text-[#28604f]" },
  Rejected: { title: "Application decision recorded", description: "A decision has been recorded for your application. Please contact the admissions office for assistance.", className: "border-[#e7b2aa] bg-[#fff5f2] text-[#8e3b32]" },
  Waitlisted: { title: "Application waitlisted", description: "Your application is currently waitlisted. Please monitor this page for the next update.", className: "border-[#c5c8e6] bg-[#f4f4ff] text-[#4d528c]" },
};

export default function SubmissionStatus() {
  const [, navigate] = useLocation();
  const status = trpc.admissionApplication.status.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (status.error?.data?.code === "UNAUTHORIZED") navigate("/login");
  }, [status.error, navigate]);

  if (status.isLoading) return <StatusSkeleton />;
  if (status.error) return <StatusError onBack={() => navigate("/dashboard")} />;
  if (!status.data) return <NoApplication onStart={() => navigate("/admission-application")} />;

  const application = status.data;
  const currentStatus = (application.status ?? "Pending") as Status;
  const copy = statusCopy[currentStatus];
  const isFinal = currentStatus === "Approved" || currentStatus === "Rejected";

  return <main className="min-h-screen bg-[#f7fbf8] text-[#15232d]"><div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8 lg:px-10">
    <header className="flex items-center justify-between border-b border-[#dce2dc] pb-6"><button className="text-left" onClick={() => navigate("/dashboard")} type="button"><BrandMark /></button><Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 text-[#65747a]"><ArrowLeft className="size-4" /> Dashboard</Button></header>
    <section className="py-9 lg:py-12"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#087f5b]">{CHMSU_BRAND.tagline}</p><h1 className="font-serif text-4xl tracking-[-0.04em] text-[#07563f] sm:text-5xl">Application status</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#65747a]">Track your admission application and review the information submitted to {CHMSU_BRAND.shortName}.</p></div><Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching} className="w-fit gap-2 rounded-xl border-[#d5ded8] text-[#07563f]"><RefreshCw className={`size-4 ${status.isFetching ? "animate-spin" : ""}`} /> Refresh status</Button></div>
      <div className={`mt-8 rounded-2xl border p-6 sm:p-8 ${copy.className}`}><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em]">Current status</p><h2 className="mt-2 font-serif text-3xl tracking-[-0.03em]">{copy.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6">{copy.description}</p></div><span className="w-fit rounded-full border-current bg-white/70 px-4 py-2 text-sm font-bold">{currentStatus}</span></div></div>
      <StatusTimeline status={currentStatus} />
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]"><div className="space-y-5"><Section title="Application summary" icon={<FileText className="size-5" />}><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2"><Detail label="Reference number" value={`AD-${String(application.admission_id).padStart(6, "0")}`} /><Detail label="Application type" value={application.application_type ?? "—"} /><Detail label="Preferred campus" value={application.CAMPUS?.campus_name ?? "—"} /><Detail label="Preferred program" value={application.PROGRAM?.program_name ?? "—"} /><Detail label="College" value={application.PROGRAM?.college ?? "—"} /><Detail label="Previous school" value={application.prev_school ?? "—"} /><Detail label="School type" value={application.school_type ?? "—"} /><Detail label="Year graduated" value={application.year_graduated?.toString() ?? "—"} /><Detail label="GWA" value={application.gwa?.toString() ?? "—"} /><Detail label="Honors" value={application.honors ?? "—"} /></div></Section><Section title="Exam registration" icon={<CalendarDays className="size-5" />}><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2"><Detail label="Exam type" value={application.exam_type ?? "—"} /><Detail label="Exam date" value={formatDate(application.exam_date)} /><Detail label="Time slot" value={application.exam_time_slot ?? "—"} /><Detail label="Venue" value={application.exam_venue ?? "—"} /></div></Section></div><div className="space-y-5"><Section title="Submitted documents" icon={<ShieldCheck className="size-5" />}><div className="space-y-3">{application.documents.length ? application.documents.map(document => <div className="flex items-start gap-3 rounded-xl border border-[#edf0eb] bg-[#fbfcf9] p-3" key={`${document.doc_type}-${document.file_name}`}><span className="mt-0.5 grid size-7 place-items-center rounded-full bg-[#eaf7f1] text-[#087f5b]"><Check className="size-4" /></span><div className="min-w-0"><p className="text-sm font-semibold text-[#07563f]">{document.doc_type}</p><p className="mt-1 truncate text-xs text-[#7b8889]">{document.file_name ?? "Uploaded document"}</p></div></div>) : <p className="text-sm text-[#7b8889]">No document metadata is available yet.</p>}</div></Section><Section title="What happens next" icon={<Clock3 className="size-5" />}><p className="text-sm leading-6 text-[#65747a]">{isFinal ? currentStatus === "Approved" ? "Continue to Online Enrollment from your dashboard to complete your enrollment details." : "Contact the admissions office if you need clarification about your decision." : "The admissions office will review your submitted information and update this status page when a decision is available."}</p></Section></div></div>
    </section></div></main>;
}

function StatusTimeline({ status }: { status: Status }) {
  const stages = ["Submitted", "Under review", status === "Approved" ? "Approved" : status === "Rejected" ? "Decision recorded" : status === "Waitlisted" ? "Waitlisted" : "Decision pending"];
  const currentIndex = status === "Pending" ? 1 : 2;
  return <section className="mt-6 rounded-2xl border border-[#dce2dc] bg-white p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-3">{stages.map((stage, index) => <div className="flex items-start gap-3" key={stage}><span className={`grid size-9 shrink-0 place-items-center rounded-full border ${index <= currentIndex ? "border-[#087f5b] bg-[#eaf7f1] text-[#087f5b]" : "border-[#dce2dc] text-[#9aa6a2]"}`}>{index < currentIndex ? <Check className="size-4" /> : index === currentIndex ? <Clock3 className="size-4" /> : index === 2 && status === "Rejected" ? <XCircle className="size-4" /> : index + 1}</span><div><p className={`text-sm font-semibold ${index <= currentIndex ? "text-[#07563f]" : "text-[#8b9798]"}`}>{stage}</p><p className="mt-1 text-xs leading-5 text-[#7b8889]">{index === 0 ? "Application received" : index === 1 ? "Admissions review" : "Final update"}</p></div></div>)}</div></section>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#dce2dc] bg-white p-6 sm:p-7"><div className="flex items-center gap-3 border-b border-[#edf0eb] pb-4 text-[#087f5b]"><span className="grid size-9 place-items-center rounded-lg bg-[#eaf7f1]">{icon}</span><h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#07563f]">{title}</h2></div><div className="pt-5">{children}</div></section>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-[0.12em] text-[#8b9798]">{label}</dt><dd className="mt-1 text-sm font-semibold leading-6 text-[#07563f]">{value}</dd></div>; }
function formatDate(value: string | null) { if (!value) return "—"; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
function NoApplication({ onStart }: { onStart: () => void }) { return <EmptyState title="No submitted application yet" description="Complete the admission application to see your submission progress here." action="Start application" onAction={onStart} />; }
function StatusError({ onBack }: { onBack: () => void }) { return <EmptyState title="We could not load your status" description="Please return to your dashboard and try again." action="Back to dashboard" onAction={onBack} />; }
function EmptyState({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) { return <main className="grid min-h-screen place-items-center bg-[#f7fbf8] px-5"><div className="max-w-md rounded-2xl border border-[#dce2dc] bg-white p-8 text-center"><BrandMark /><h1 className="mt-8 font-serif text-3xl text-[#07563f]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#65747a]">{description}</p><Button onClick={onAction} className="mt-6 rounded-xl bg-[#07563f] text-white hover:bg-[#087f5b]">{action}</Button></div></main>; }
function StatusSkeleton() { return <main className="min-h-screen bg-[#f7fbf8] p-6"><div className="mx-auto max-w-[1180px] animate-pulse space-y-6"><div className="h-12 rounded-xl bg-[#e4e9e3]" /><div className="h-48 rounded-2xl bg-[#dbe5e0]" /><div className="h-32 rounded-2xl bg-white" /><div className="h-80 rounded-2xl bg-white" /></div></main>; }
