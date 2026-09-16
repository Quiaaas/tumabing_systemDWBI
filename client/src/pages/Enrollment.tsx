import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileUp, Loader2, LockKeyhole, LogOut, Trash2, UploadCloud } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const DRAFT_KEY = "student-admission-enrollment-draft";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const medicalDocumentTypes = ["Medical Certificate", "Chest X-Ray Result", "Other Medical Document"] as const;
const emptyDraft = {
  previousSchool: "",
  insuranceRefNumber: "",
  emergencyContact: { fullName: "", relationship: "", mobile: "", email: "" },
  scholarship: { scholarshipType: "", scholarshipName: "", grantingBody: "" },
  hasScholarship: false,
  medicalDocuments: {} as Record<string, { fileName: string; fileSizeBytes: number; contentType: string; contentBase64: string }>,
  subjectCodes: [] as string[],
};
type EnrollmentDraft = typeof emptyDraft;
const steps = ["Enrollment info", "Emergency contact", "Scholarship", "Medical documents", "Subjects", "Review"];

export default function Enrollment() {
  const [, navigate] = useLocation();
  const applicant = trpc.applicantAuth.me.useQuery();
  const options = trpc.enrollment.options.useQuery();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EnrollmentDraft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const submit = trpc.enrollment.submit.useMutation({
    onSuccess: result => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success(`Enrollment submitted: ${result.enrollmentRefCode}`);
      navigate("/dashboard");
    },
  });

  useEffect(() => {
    if (!applicant.isLoading && !applicant.data) navigate("/login");
  }, [applicant.data, applicant.isLoading, navigate]);

  useEffect(() => {
    if (options.error) navigate("/dashboard");
  }, [options.error, navigate]);

  useEffect(() => {
    if (loaded) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<EnrollmentDraft>;
      setDraft(current => ({ ...current, ...saved, emergencyContact: { ...current.emergencyContact, ...(saved.emergencyContact ?? {}) }, scholarship: { ...current.scholarship, ...(saved.scholarship ?? {}) }, medicalDocuments: saved.medicalDocuments ?? current.medicalDocuments, subjectCodes: saved.subjectCodes ?? current.subjectCodes }));
    } catch {
      setError("Saved enrollment progress could not be restored.");
    }
    setLoaded(true);
  }, [loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, loaded]);

  const update = (patch: Partial<EnrollmentDraft>) => { setError(""); setDraft(current => ({ ...current, ...patch })); };
  const updateContact = (patch: Partial<EnrollmentDraft["emergencyContact"]>) => update({ emergencyContact: { ...draft.emergencyContact, ...patch } });
  const updateScholarship = (patch: Partial<EnrollmentDraft["scholarship"]>) => update({ scholarship: { ...draft.scholarship, ...patch } });
  const selectedSubjects = useMemo(() => options.data?.subjects.filter(subject => draft.subjectCodes.includes(subject.subject_code)) ?? [], [draft.subjectCodes, options.data?.subjects]);

  const validate = (target: number) => {
    if (target === 1 && !draft.previousSchool.trim()) return showError("Please enter your previous school.");
    if (target === 2) {
      const contact = draft.emergencyContact;
      if (!contact.fullName || !contact.relationship || !contact.mobile || !contact.email) return showError("Please complete the emergency contact fields.");
      if (!/^\S+@\S+\.\S+$/.test(contact.email)) return showError("Please enter a valid emergency contact email.");
    }
    if (target === 5 && draft.subjectCodes.length === 0) return showError("Please select at least one course subject.");
    return true;
  };
  const showError = (message: string) => { setError(message); return false; };
  const next = () => { if (validate(step)) setStep(current => Math.min(6, current + 1)); };
  const back = () => { setError(""); setStep(current => Math.max(1, current - 1)); };

  const handleMedicalFile = async (type: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError("For draft persistence, each medical document must be 2 MB or smaller."); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => update({ medicalDocuments: { ...draft.medicalDocuments, [type]: { fileName: file.name, fileSizeBytes: file.size, contentType: file.type, contentBase64: String(reader.result).split(",")[1] ?? "" } } });
    reader.readAsDataURL(file);
  };
  const removeMedicalFile = (type: string) => { const files = { ...draft.medicalDocuments }; delete files[type]; update({ medicalDocuments: files }); };

  const submitEnrollment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate(5)) return;
    submit.mutate({
      previousSchool: draft.previousSchool,
      insuranceRefNumber: draft.insuranceRefNumber,
      emergencyContact: draft.emergencyContact,
      scholarship: draft.hasScholarship ? draft.scholarship : null,
      medicalDocuments: Object.entries(draft.medicalDocuments).map(([docType, file]) => ({ docType, ...file })),
      subjectCodes: draft.subjectCodes,
    });
  };

  if (applicant.isLoading || !applicant.data || options.isLoading || !loaded) return <EnrollmentSkeleton />;

  return <main className="min-h-screen bg-[#f6f7f2] text-[#15232d]"><div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8 lg:px-10">
    <header className="flex items-center justify-between border-b border-[#dce2dc] pb-6"><button className="flex items-center gap-3 text-left" onClick={() => navigate("/dashboard")} type="button"><span className="grid size-10 place-items-center rounded-full bg-[#102b3a] text-[#f0c36b]"><LockKeyhole className="size-5" /></span><span><strong className="block text-sm text-[#102b3a]">Student Admissions</strong><small className="text-xs uppercase tracking-[0.18em] text-[#7b8889]">Online enrollment</small></span></button><Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 text-[#65747a]"><LogOut className="size-4" /> Exit</Button></header>
    <section className="py-9 lg:py-12"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#a26b18]">Approved applicant</p><h1 className="font-serif text-4xl tracking-[-0.04em] text-[#102b3a] sm:text-5xl">Complete your enrollment.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#65747a]">Your admission is approved. Finish the details below to create your enrollment record.</p></div>
      <nav className="mt-9 grid grid-cols-3 gap-1 rounded-2xl border border-[#dce2dc] bg-white p-2 sm:grid-cols-6 sm:gap-2 sm:p-3" aria-label="Enrollment progress">{steps.map((label, index) => <button type="button" key={label} onClick={() => index + 1 < step && setStep(index + 1)} className={`min-w-0 rounded-xl px-2 py-2 text-left text-xs font-semibold ${step === index + 1 ? "bg-[#102b3a] text-white" : step > index + 1 ? "bg-[#effaf5] text-[#28604f]" : "text-[#8b9798]"}`}><span className="mr-1.5 inline-grid size-5 place-items-center rounded-full border border-current text-[10px]">{step > index + 1 ? <Check className="size-3" /> : index + 1}</span><span className="hidden sm:inline">{label}</span></button>)}</nav>
      <form onSubmit={submitEnrollment} className="mt-6"><div className="rounded-2xl border border-[#dce2dc] bg-white p-5 shadow-[0_12px_30px_rgba(21,35,45,0.04)] sm:p-8">
        {step === 1 && <EnrollmentInfo draft={draft} update={update} />}
        {step === 2 && <Emergency draft={draft} updateContact={updateContact} />}
        {step === 3 && <Scholarship draft={draft} update={update} updateScholarship={updateScholarship} />}
        {step === 4 && <Medical draft={draft} handleFile={handleMedicalFile} removeFile={removeMedicalFile} />}
        {step === 5 && <Subjects draft={draft} update={update} subjects={options.data?.subjects ?? []} />}
        {step === 6 && <Review draft={draft} selectedSubjects={selectedSubjects} />}
        {(error || submit.error) && <div className="mt-7 rounded-xl border border-[#e7b2aa] bg-[#fff5f2] px-4 py-3 text-sm leading-5 text-[#8e3b32]" role="alert">{error || submit.error?.message}</div>}
        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#edf0eb] pt-6 sm:flex-row"><Button type="button" variant="outline" onClick={back} disabled={step === 1} className="gap-2 rounded-xl border-[#d5ded8]"><ArrowLeft className="size-4" /> Back</Button>{step < 6 ? <Button type="button" onClick={next} className="gap-2 rounded-xl bg-[#102b3a] text-white hover:bg-[#1d4558]">Continue <ArrowRight className="size-4" /></Button> : <Button type="submit" disabled={submit.isPending} className="gap-2 rounded-xl bg-[#102b3a] text-white hover:bg-[#1d4558]">{submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{submit.isPending ? "Submitting…" : "Submit enrollment"}</Button>}</div>
      </div></form>
    </section></div></main>;
}

function EnrollmentInfo({ draft, update }: { draft: EnrollmentDraft; update: (patch: Partial<EnrollmentDraft>) => void }) { return <Shell eyebrow="Step 1 of 6" title="Enrollment information" description="Confirm your school background and insurance reference. Payment status is managed by the admissions office."><Field label="Previous school" required><Input value={draft.previousSchool} onChange={event => update({ previousSchool: event.target.value })} placeholder="Enter your previous school" /></Field><Field label="Insurance reference number"><Input value={draft.insuranceRefNumber} onChange={event => update({ insuranceRefNumber: event.target.value })} placeholder="Optional" /></Field><div className="rounded-xl border border-[#e5c98d] bg-[#fff8e8] p-4 text-sm leading-6 text-[#755314]"><strong>Payment status:</strong> Unpaid. This value is not applicant-editable and will be updated manually through the database.</div></Shell>; }
function Emergency({ draft, updateContact }: { draft: EnrollmentDraft; updateContact: (patch: Partial<EnrollmentDraft["emergencyContact"]>) => void }) { return <Shell eyebrow="Step 2 of 6" title="Emergency contact" description="Add one person we can contact in case of an emergency. All fields are required."><div className="grid gap-5 md:grid-cols-2"><Field label="Full name" required><Input value={draft.emergencyContact.fullName} onChange={event => updateContact({ fullName: event.target.value })} /></Field><Field label="Relationship" required><Input value={draft.emergencyContact.relationship} onChange={event => updateContact({ relationship: event.target.value })} placeholder="Parent, guardian, sibling…" /></Field><Field label="Mobile" required><Input type="tel" value={draft.emergencyContact.mobile} onChange={event => updateContact({ mobile: event.target.value })} /></Field><Field label="Email" required><Input type="email" value={draft.emergencyContact.email} onChange={event => updateContact({ email: event.target.value })} /></Field></div></Shell>; }
function Scholarship({ draft, update, updateScholarship }: { draft: EnrollmentDraft; update: (patch: Partial<EnrollmentDraft>) => void; updateScholarship: (patch: Partial<EnrollmentDraft["scholarship"]>) => void }) { return <Shell eyebrow="Step 3 of 6" title="Scholarship" description="Add scholarship details if you have one. This section is optional and may be skipped."><label className="flex items-center gap-3 rounded-xl border border-[#dce2dc] bg-[#fbfcf9] p-4 text-sm font-semibold text-[#102b3a]"><input type="checkbox" checked={draft.hasScholarship} onChange={event => update({ hasScholarship: event.target.checked })} className="size-4 accent-[#102b3a]" /> I have a scholarship to declare</label>{draft.hasScholarship && <div className="grid gap-5 pt-2 md:grid-cols-2"><Field label="Scholarship type" required><Input value={draft.scholarship.scholarshipType} onChange={event => updateScholarship({ scholarshipType: event.target.value })} /></Field><Field label="Scholarship name" required><Input value={draft.scholarship.scholarshipName} onChange={event => updateScholarship({ scholarshipName: event.target.value })} /></Field><Field label="Granting body" required><Input value={draft.scholarship.grantingBody} onChange={event => updateScholarship({ grantingBody: event.target.value })} /></Field></div>}</Shell>; }
function Medical({ draft, handleFile, removeFile }: { draft: EnrollmentDraft; handleFile: (type: string, event: ChangeEvent<HTMLInputElement>) => void; removeFile: (type: string) => void }) { return <Shell eyebrow="Step 4 of 6" title="Medical documents" description="Upload any medical documents requested by the institution. Uploads are optional in this phase."><div className="grid gap-4 md:grid-cols-3">{medicalDocumentTypes.map(type => { const file = draft.medicalDocuments[type]; return <div className="rounded-2xl border border-[#dce2dc] p-5" key={type}><span className="grid size-10 place-items-center rounded-xl bg-[#f4f6f2] text-[#7b8889]">{file ? <CheckCircle2 className="size-5 text-[#28604f]" /> : <FileUp className="size-5" />}</span><p className="mt-4 text-sm font-semibold text-[#102b3a]">{type}</p>{file ? <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[#28604f]"><span className="truncate">{file.fileName}</span><button type="button" onClick={() => removeFile(type)} aria-label={`Remove ${type}`}><Trash2 className="size-4 text-[#8e3b32]" /></button></div> : <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#102b3a] underline decoration-[#f0c36b] decoration-2 underline-offset-4"><UploadCloud className="size-4" /> Choose file<input type="file" className="sr-only" onChange={event => handleFile(type, event)} /></label>}</div>; })}</div><p className="mt-5 text-xs text-[#7b8889]">Maximum 2 MB per file while keeping your enrollment draft in this browser.</p></Shell>; }
function Subjects({ draft, update, subjects }: { draft: EnrollmentDraft; update: (patch: Partial<EnrollmentDraft>) => void; subjects: Array<{ subject_code: string; title: string | null; units: number | null; days: string | null; time_slot: string | null; room: string | null; instructor: string | null; subject_type: string | null; is_required: boolean | null }> }) { const toggle = (code: string) => update({ subjectCodes: draft.subjectCodes.includes(code) ? draft.subjectCodes.filter(item => item !== code) : [...draft.subjectCodes, code] }); return <Shell eyebrow="Step 5 of 6" title="Select subjects" description="Choose the available course subjects for your approved program. Required subjects are marked."><div className="space-y-3">{subjects.length === 0 && <p className="rounded-xl border border-[#e5c98d] bg-[#fff8e8] p-4 text-sm text-[#755314]">No course subjects are currently available for your program.</p>}{subjects.map(subject => <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${draft.subjectCodes.includes(subject.subject_code) ? "border-[#afd2c4] bg-[#f5fcf8]" : "border-[#dce2dc] bg-white"}`} key={subject.subject_code}><input type="checkbox" checked={draft.subjectCodes.includes(subject.subject_code)} onChange={() => toggle(subject.subject_code)} className="mt-1 size-4 accent-[#102b3a]" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#102b3a]"><span>{subject.subject_code}</span><span className="font-normal text-[#65747a]">{subject.title}</span>{subject.is_required && <span className="rounded-full bg-[#fff8e8] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#8d6418]">Required</span>}</span><span className="mt-2 block text-xs leading-5 text-[#7b8889]">{subject.units ?? 0} units · {subject.days || "Schedule TBA"} · {subject.time_slot || "Time TBA"} · {subject.room || "Room TBA"} · {subject.instructor || "Instructor TBA"}</span></span></label>)}</div></Shell>; }
function Review({ draft, selectedSubjects }: { draft: EnrollmentDraft; selectedSubjects: Array<{ subject_code: string; title: string | null; units: number | null }> }) { return <Shell eyebrow="Step 6 of 6" title="Review & submit" description="Confirm your enrollment details before creating the enrollment record."><div className="grid gap-5 md:grid-cols-2"><ReviewSection title="Enrollment" rows={[["Previous school", draft.previousSchool], ["Insurance reference", draft.insuranceRefNumber || "—"], ["Payment status", "Unpaid · office managed"]]} /><ReviewSection title="Emergency contact" rows={[["Name", draft.emergencyContact.fullName], ["Relationship", draft.emergencyContact.relationship], ["Mobile", draft.emergencyContact.mobile], ["Email", draft.emergencyContact.email]]} /><ReviewSection title="Scholarship" rows={draft.hasScholarship ? [["Type", draft.scholarship.scholarshipType], ["Name", draft.scholarship.scholarshipName], ["Granting body", draft.scholarship.grantingBody]] : [["Status", "Skipped"]]} /><ReviewSection title="Subjects" rows={selectedSubjects.map(subject => [subject.subject_code, `${subject.title ?? "Untitled"} · ${subject.units ?? 0} units`])} /></div><div className="mt-6 rounded-xl border border-[#afd2c4] bg-[#effaf5] p-4 text-sm leading-6 text-[#28604f]"><CheckCircle2 className="mr-2 inline size-4" />Your enrollment reference code will be generated automatically on submit.</div></Shell>; }
function Shell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) { return <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a26b18]">{eyebrow}</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.03em] text-[#102b3a] sm:text-4xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#65747a]">{description}</p><div className="mt-8 space-y-6">{children}</div></div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <div className="space-y-2"><Label>{label}{required && <span className="ml-1 text-[#a26b18]">*</span>}</Label>{children}</div>; }
function ReviewSection({ title, rows }: { title: string; rows: Array<[string, string]> }) { return <section className="rounded-2xl border border-[#dce2dc] bg-[#fbfcf9] p-5"><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#a26b18]">{title}</h3><dl className="mt-4 space-y-3">{rows.length ? rows.map(([label, value]) => <div className="grid grid-cols-[minmax(96px,0.45fr)_1fr] gap-3 text-sm" key={label}><dt className="text-[#8b9798]">{label}</dt><dd className="break-words font-medium text-[#102b3a]">{value || "—"}</dd></div>) : <p className="text-sm text-[#8b9798]">None</p>}</dl></section>; }
function EnrollmentSkeleton() { return <main className="min-h-screen bg-[#f6f7f2] p-6"><div className="mx-auto max-w-[1180px] animate-pulse space-y-8"><div className="h-12 rounded-xl bg-[#e4e9e3]" /><div className="h-24 rounded-2xl bg-[#e4e9e3]" /><div className="h-[620px] rounded-2xl bg-white" /></div></main>; }
