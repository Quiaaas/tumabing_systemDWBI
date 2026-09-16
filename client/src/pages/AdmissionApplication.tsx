import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileUp, Loader2, LogOut, Save, Trash2, UploadCloud } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { APPLICATION_TYPES, CIVIL_STATUS_OPTIONS, EMPTY_APPLICATION_DRAFT, EXAM_TIME_OPTIONS, EXAM_TYPE_OPTIONS, EXAM_VENUE_OPTIONS, getDocumentRules, SCHOOL_TYPE_OPTIONS, SEX_OPTIONS, type ApplicationDraft } from "@/config/application";
import { calculateAge, getBarangays, getCitiesMunicipalities, getProvinces, getRegions, type PsgcPlace } from "@/lib/psgc";
import BrandMark from "@/components/BrandMark";
import { CHMSU_BRAND } from "@/config/brand";

const DRAFT_KEY_PREFIX = "student-admission-application-draft:";
const MAX_LOCAL_FILE_SIZE = 2 * 1024 * 1024;

const steps = [
  { number: 1, label: "Applicant" },
  { number: 2, label: "Academic" },
  { number: 3, label: "Requirements" },
  { number: 4, label: "Exam" },
  { number: 5, label: "Review" },
];

export default function AdmissionApplication() {
  const [, navigate] = useLocation();
  const applicant = trpc.applicantAuth.me.useQuery();
  const options = trpc.admissionApplication.options.useQuery();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ApplicationDraft>(EMPTY_APPLICATION_DRAFT);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [error, setError] = useState("");
  const campusPrograms = trpc.admissionApplication.programsByCampus.useQuery(
    { campusId: Number(draft.campusId) },
    { enabled: Boolean(draft.campusId) },
  );
  const submit = trpc.admissionApplication.submit.useMutation({
    onSuccess: () => {
      if (applicant.data?.applicantId) localStorage.removeItem(`${DRAFT_KEY_PREFIX}${applicant.data.applicantId}`);
      toast.success("Your admission application was submitted.");
      navigate("/submission-status");
    },
  });

  useEffect(() => {
    if (!applicant.isLoading && !applicant.data) navigate("/login");
  }, [applicant.data, applicant.isLoading, navigate]);

  useEffect(() => {
    if (!applicant.data || draftLoaded) return;
    const profile = applicant.data;
    const storageKey = `${DRAFT_KEY_PREFIX}${profile.applicantId}`;
    let saved: Partial<ApplicationDraft> = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<ApplicationDraft>;
    } catch {
      saved = {};
    }
    setDraft(current => ({
      ...current,
      ...saved,
      email: saved.email || profile.email || current.email,
      mobile: saved.mobile || profile.mobile || current.mobile,
      documents: saved.documents || current.documents,
    }));
    setDraftLoaded(true);
  }, [applicant.data, draftLoaded]);

  useEffect(() => {
    if (!draftLoaded || !applicant.data) return;
    try {
      localStorage.setItem(`${DRAFT_KEY_PREFIX}${applicant.data.applicantId}`, JSON.stringify(draft));
    } catch {
      setError("Your browser could not save the full draft locally. Keep this tab open while completing uploads.");
    }
  }, [applicant.data, draft, draftLoaded]);

  const documentRules = useMemo(() => getDocumentRules(draft.applicationType), [draft.applicationType]);
  const updateDraft = (patch: Partial<ApplicationDraft>) => {
    setError("");
    setDraft(current => ({ ...current, ...patch }));
  };

  const validateStep = (targetStep: number) => {
    const requiredByStep: Record<number, Array<[keyof ApplicationDraft, string]>> = {
      1: [
        ["applicationType", "application type"], ["lrn", "LRN"], ["lastName", "last name"], ["firstName", "first name"],
        ["sex", "sex"], ["civilStatus", "civil status"], ["birthDate", "birth date"], ["email", "email"], ["mobile", "mobile number"],
        ["regionCode", "region"], ["provinceCode", "province"], ["cityCode", "city / municipality"], ["barangayCode", "barangay"],
      ],
      2: [["prevSchool", "previous school"], ["prevSchoolAddress", "school address"], ["schoolType", "school type"], ["yearGraduated", "year graduated"], ["gwa", "GWA"], ["campusId", "preferred campus"], ["programId", "preferred program"]],
      4: [["examType", "exam type"], ["examDate", "exam date"], ["examTimeSlot", "exam time slot"], ["examVenue", "exam venue"]],
    };
    const missing = (requiredByStep[targetStep] ?? []).find(([key]) => !String(draft[key] ?? "").trim());
    if (missing) {
      setError(`Please complete your ${missing[1]} before continuing.`);
      return false;
    }
    if (targetStep === 1 && !/^\S+@\S+\.\S+$/.test(draft.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (targetStep === 3) {
      const missingDocuments = documentRules.filter(rule => rule.required && !draft.documents[rule.type]);
      if (missingDocuments.length > 0) {
        setError(`Please upload: ${missingDocuments.map(document => document.type).join(", ")}.`);
        return false;
      }
    }
    return true;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const next = () => {
    if (validateStep(step)) {
      setStep(current => Math.min(5, current + 1));
      scrollToTop();
    }
  };

  const previous = () => {
    setError("");
    setStep(current => Math.max(1, current - 1));
    scrollToTop();
  };

  const handleFile = async (documentType: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOCAL_FILE_SIZE) {
      setError("For draft persistence, each file must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    const contentBase64 = await readFileAsBase64(file);
    updateDraft({
      documents: {
        ...draft.documents,
        [documentType]: { fileName: file.name, fileSizeBytes: file.size, contentType: file.type, contentBase64 },
      },
    });
  };

  const removeFile = (documentType: string) => {
    const documents = { ...draft.documents };
    delete documents[documentType];
    updateDraft({ documents });
  };

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep(5)) return;
    submit.mutate({
      ...draft,
      yearGraduated: Number(draft.yearGraduated),
      gwa: Number(draft.gwa),
      campusId: Number(draft.campusId),
      programId: Number(draft.programId),
      documents: Object.entries(draft.documents).map(([docType, file]) => ({ docType, ...file })),
    });
  };

  if (applicant.isLoading || !applicant.data || !draftLoaded) return <ApplicationSkeleton />;

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-[#15232d]">
      <div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#dce2dc] pb-6">
          <button className="flex items-center gap-3 text-left" onClick={() => navigate("/dashboard")} type="button">
            <BrandMark />
          </button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 text-[#65747a]"><LogOut className="size-4" /> Exit</Button>
        </header>

        <section className="py-9 lg:py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#087f5b]">{CHMSU_BRAND.tagline}</p><h1 className="font-serif text-4xl tracking-[-0.04em] text-[#07563f] sm:text-5xl">Build your application.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#65747a]">{CHMSU_BRAND.name} keeps your progress saved in this browser between steps.</p></div>
            <div className="flex items-center gap-2 text-xs text-[#718087]"><Save className="size-4 text-[#087f5b]" /> Draft saved automatically</div>
          </div>

          <nav aria-label="Application progress" className="mt-9 grid grid-cols-5 gap-1 rounded-2xl border border-[#dce2dc] bg-white p-2 sm:gap-2 sm:p-3">
            {steps.map(item => <button className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold transition-colors sm:px-3 ${step === item.number ? "bg-[#07563f] text-white" : step > item.number ? "bg-[#effaf5] text-[#28604f]" : "text-[#8b9798] hover:bg-[#f7fbf8]"}`} key={item.number} onClick={() => { if (item.number < step) { setStep(item.number); window.scrollTo({ top: 0, behavior: "smooth" }); } }} type="button"><span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-[11px]">{step > item.number ? <Check className="size-3.5" /> : item.number}</span><span className="hidden truncate sm:inline">{item.label}</span></button>)}
          </nav>

          <form onSubmit={submitApplication} className="mt-6">
            <div className="rounded-2xl border border-[#dce2dc] bg-white p-5 shadow-[0_12px_30px_rgba(21,35,45,0.04)] sm:p-8">
              {step === 1 && <StepOne draft={draft} updateDraft={updateDraft} />}
              {step === 2 && <StepTwo draft={draft} updateDraft={updateDraft} campuses={options.data?.campuses ?? []} programs={campusPrograms.data ?? []} programsLoading={campusPrograms.isLoading} />}
              {step === 3 && <StepThree draft={draft} documentRules={documentRules} handleFile={handleFile} removeFile={removeFile} />}
              {step === 4 && <StepFour draft={draft} updateDraft={updateDraft} />}
              {step === 5 && <StepFive draft={draft} campuses={options.data?.campuses ?? []} programs={options.data?.programs ?? []} documentRules={documentRules} />}

              {(error || submit.error) && <div className="mt-7 rounded-xl border border-[#e7b2aa] bg-[#fff5f2] px-4 py-3 text-sm leading-5 text-[#8e3b32]" role="alert">{error || submit.error?.message}</div>}

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#edf0eb] pt-6 sm:flex-row">
                <Button type="button" variant="outline" onClick={previous} disabled={step === 1} className="gap-2 rounded-xl border-[#d5ded8]"><ArrowLeft className="size-4" /> Back</Button>
                {step < 5 ? <Button type="button" onClick={next} className="gap-2 rounded-xl bg-[#07563f] text-white hover:bg-[#1d4558]">Continue <ArrowRight className="size-4" /></Button> : <Button type="submit" disabled={submit.isPending} className="gap-2 rounded-xl bg-[#07563f] text-white hover:bg-[#1d4558]">{submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{submit.isPending ? "Submitting…" : "Submit application"}</Button>}
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function StepOne({ draft, updateDraft }: { draft: ApplicationDraft; updateDraft: (patch: Partial<ApplicationDraft>) => void }) {
  return <StepShell eyebrow="Step 1 of 5" title="LRN & applicant information" description="Tell us who you are and how we can reach you.">
    <Field label="Application type" required><select className={selectClass} value={draft.applicationType} onChange={event => updateDraft({ applicationType: event.target.value as ApplicationDraft["applicationType"], documents: {} })}><option value="">Select application type</option>{APPLICATION_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
    <div className="grid gap-5 md:grid-cols-2"><Field label="Learner Reference Number (LRN)" required><Input value={draft.lrn} onChange={event => updateDraft({ lrn: event.target.value })} placeholder="Enter your LRN" /></Field><Field label="Email address" required><Input type="email" value={draft.email} onChange={event => updateDraft({ email: event.target.value })} placeholder="you@example.com" /></Field></div>
    <div className="grid gap-5 md:grid-cols-3"><Field label="Last name" required><Input value={draft.lastName} onChange={event => updateDraft({ lastName: event.target.value })} /></Field><Field label="First name" required><Input value={draft.firstName} onChange={event => updateDraft({ firstName: event.target.value })} /></Field><Field label="Middle name"><Input value={draft.middleName} onChange={event => updateDraft({ middleName: event.target.value })} /></Field></div>
    <div className="grid gap-5 md:grid-cols-3"><Field label="Suffix"><Input value={draft.suffix} onChange={event => updateDraft({ suffix: event.target.value })} placeholder="Jr., III, etc." /></Field><Field label="Sex" required><Select value={draft.sex} onChange={value => updateDraft({ sex: value })} options={SEX_OPTIONS} placeholder="Select sex" /></Field><Field label="Civil status" required><Select value={draft.civilStatus} onChange={value => updateDraft({ civilStatus: value })} options={CIVIL_STATUS_OPTIONS} placeholder="Select civil status" /></Field></div>
    <div className="grid gap-5 md:grid-cols-2"><Field label="Birth date" required><Input type="date" max={new Date().toISOString().slice(0, 10)} value={draft.birthDate} onChange={event => updateDraft({ birthDate: event.target.value })} /></Field><div className="flex items-end"><div className="w-full rounded-xl border border-[#dce2dc] bg-[#fbfcf9] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b9798]">Age</p><p className="mt-1 text-sm font-semibold text-[#07563f]">{calculateAge(draft.birthDate) === null ? "Calculated automatically" : `${calculateAge(draft.birthDate)} years old`}</p></div></div></div>
    <div className="border-t border-[#edf0eb] pt-6"><p className="mb-1 text-sm font-semibold text-[#07563f]">Contact and address</p><p className="mb-4 text-xs leading-5 text-[#7b8889]">Address options are sourced from the public PSGC dataset. Each list narrows after you select its parent.</p><div className="grid gap-5 md:grid-cols-2"><Field label="Mobile number" required><Input type="tel" value={draft.mobile} onChange={event => updateDraft({ mobile: event.target.value })} placeholder="09XX XXX XXXX" /></Field><PsgcAddress draft={draft} updateDraft={updateDraft} /></div></div>
  </StepShell>;
}

function PsgcAddress({ draft, updateDraft }: { draft: ApplicationDraft; updateDraft: (patch: Partial<ApplicationDraft>) => void }) {
  const [regions, setRegions] = useState<PsgcPlace[]>([]);
  const [provinces, setProvinces] = useState<PsgcPlace[]>([]);
  const [cities, setCities] = useState<PsgcPlace[]>([]);
  const [barangays, setBarangays] = useState<PsgcPlace[]>([]);
  const [loading, setLoading] = useState("Loading regions…");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getRegions().then(items => { if (active) { setRegions(items); setLoading(""); } }).catch(() => { if (active) { setLoadError("PSGC address data is unavailable. Please try again."); setLoading(""); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draft.regionCode) { setProvinces([]); return; }
    let active = true;
    setLoading("Loading provinces…");
    getProvinces(draft.regionCode).then(items => { if (active) { setProvinces(items); setLoading(""); } }).catch(() => { if (active) setLoadError("Province data could not be loaded."); });
    return () => { active = false; };
  }, [draft.regionCode]);

  useEffect(() => {
    if (!draft.provinceCode) { setCities([]); return; }
    let active = true;
    setLoading("Loading cities and municipalities…");
    getCitiesMunicipalities(draft.provinceCode).then(items => { if (active) { setCities(items); setLoading(""); } }).catch(() => { if (active) setLoadError("City and municipality data could not be loaded."); });
    return () => { active = false; };
  }, [draft.provinceCode]);

  useEffect(() => {
    if (!draft.cityCode) { setBarangays([]); return; }
    let active = true;
    setLoading("Loading barangays…");
    getBarangays(draft.cityCode).then(items => { if (active) { setBarangays(items); setLoading(""); } }).catch(() => { if (active) setLoadError("Barangay data could not be loaded."); });
    return () => { active = false; };
  }, [draft.cityCode]);

  const selectAddress = (level: "region" | "province" | "city" | "barangay", code: string, items: PsgcPlace[]) => {
    const place = items.find(item => item.code === code);
    if (level === "region") updateDraft({ regionCode: code, region: place?.name ?? "", provinceCode: "", province: "", cityCode: "", city: "", barangayCode: "", barangay: "" });
    if (level === "province") updateDraft({ provinceCode: code, province: place?.name ?? "", cityCode: "", city: "", barangayCode: "", barangay: "" });
    if (level === "city") updateDraft({ cityCode: code, city: place?.name ?? "", barangayCode: "", barangay: "" });
    if (level === "barangay") updateDraft({ barangayCode: code, barangay: place?.name ?? "" });
  };

  return <div className="col-span-full grid gap-5 md:grid-cols-2">{loadError && <p className="col-span-full rounded-xl border border-[#e7b2aa] bg-[#fff5f2] px-4 py-3 text-xs text-[#8e3b32]">{loadError}</p>}<Field label="Region" required><AddressSelect value={draft.regionCode} onChange={code => selectAddress("region", code, regions)} options={regions} placeholder={loading || "Select region"} disabled={!regions.length} /></Field><Field label="Province" required><AddressSelect value={draft.provinceCode} onChange={code => selectAddress("province", code, provinces)} options={provinces} placeholder={draft.regionCode ? "Select province" : "Select a region first"} disabled={!draft.regionCode || !provinces.length} /></Field><Field label="City / Municipality" required><AddressSelect value={draft.cityCode} onChange={code => selectAddress("city", code, cities)} options={cities} placeholder={draft.provinceCode ? "Select city / municipality" : "Select a province first"} disabled={!draft.provinceCode || !cities.length} /></Field><Field label="Barangay" required><AddressSelect value={draft.barangayCode} onChange={code => selectAddress("barangay", code, barangays)} options={barangays} placeholder={draft.cityCode ? "Select barangay" : "Select a city / municipality first"} disabled={!draft.cityCode || !barangays.length} /></Field></div>;
}

function AddressSelect({ value, onChange, options, placeholder, disabled }: { value: string; onChange: (value: string) => void; options: PsgcPlace[]; placeholder: string; disabled?: boolean }) {
  return <select className={selectClass} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}><option value="">{placeholder}</option>{options.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}</select>;
}

function StepTwo({ draft, updateDraft, campuses, programs, programsLoading }: { draft: ApplicationDraft; updateDraft: (patch: Partial<ApplicationDraft>) => void; campuses: Array<{ campus_id: number; campus_name: string | null }>; programs: Array<{ program_id: number; program_name: string | null; college: string | null }>; programsLoading: boolean }) {
  return <StepShell eyebrow="Step 2 of 5" title="Academic background" description="Share your previous school details and your preferred campus and program.">
    <div className="grid gap-5 md:grid-cols-2"><Field label="Strand / track"><Input value={draft.strand} onChange={event => updateDraft({ strand: event.target.value })} placeholder="e.g. STEM, HUMSS, ABM" /></Field><Field label="School type" required><Select value={draft.schoolType} onChange={value => updateDraft({ schoolType: value })} options={SCHOOL_TYPE_OPTIONS} placeholder="Select school type" /></Field><Field label="Previous school" required><Input value={draft.prevSchool} onChange={event => updateDraft({ prevSchool: event.target.value })} /></Field><Field label="Year graduated" required><Input type="number" min="1900" max="2100" value={draft.yearGraduated} onChange={event => updateDraft({ yearGraduated: event.target.value })} /></Field></div>
    <Field label="Previous school address" required><textarea className={textareaClass} rows={3} value={draft.prevSchoolAddress} onChange={event => updateDraft({ prevSchoolAddress: event.target.value })} /></Field>
    <div className="grid gap-5 md:grid-cols-2"><Field label="GWA" required><Input type="number" min="0" max="100" step="0.01" value={draft.gwa} onChange={event => updateDraft({ gwa: event.target.value })} placeholder="e.g. 90.50" /></Field><Field label="Honors"><Input value={draft.honors} onChange={event => updateDraft({ honors: event.target.value })} placeholder="Optional" /></Field></div>
    <div className="border-t border-[#edf0eb] pt-6"><p className="mb-4 text-sm font-semibold text-[#07563f]">Preferred placement</p><div className="grid gap-5 md:grid-cols-2"><Field label="Preferred campus" required><select className={selectClass} value={draft.campusId} onChange={event => updateDraft({ campusId: event.target.value, programId: "" })}><option value="">{campuses.length ? "Select campus" : "No campuses available"}</option>{campuses.map(campus => <option key={campus.campus_id} value={campus.campus_id}>{campus.campus_name}</option>)}</select></Field><Field label="Preferred program" required><select className={selectClass} value={draft.programId} onChange={event => updateDraft({ programId: event.target.value })} disabled={!draft.campusId || programsLoading}><option value="">{!draft.campusId ? "Select a campus first" : programsLoading ? "Loading programs…" : programs.length ? "Select program" : "No programs offered at this campus"}</option>{programs.map(program => <option key={program.program_id} value={program.program_id}>{program.program_name}{program.college ? ` · ${program.college}` : ""}</option>)}</select></Field></div></div>
  </StepShell>;
}

function StepThree({ draft, documentRules, handleFile, removeFile }: { draft: ApplicationDraft; documentRules: ReturnType<typeof getDocumentRules>; handleFile: (type: string, event: ChangeEvent<HTMLInputElement>) => void; removeFile: (type: string) => void }) {
  return <StepShell eyebrow="Step 3 of 5" title="Requirements" description={`Upload the documents for ${draft.applicationType}. Required documents must be present before you can continue.`}>
    <div className="grid gap-4 md:grid-cols-2">{documentRules.map(rule => { const file = draft.documents[rule.type]; return <div className={`rounded-2xl border p-5 ${file ? "border-[#afd2c4] bg-[#f5fcf8]" : rule.required ? "border-[#e5c98d] bg-[#fffdf6]" : "border-[#dce2dc] bg-white"}`} key={rule.type}><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${file ? "bg-[#b8dbc9] text-[#1c5949]" : "bg-[#f4f6f2] text-[#7b8889]"}`}>{file ? <CheckCircle2 className="size-5" /> : <FileUp className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#07563f]">{rule.type}</p><span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${rule.required ? "text-[#087f5b]" : "text-[#8b9798]"}`}>{rule.required ? "Required" : "Optional"}</span></div>{rule.note && <p className="mt-2 text-xs leading-5 text-[#7b8889]">{rule.note}</p>}{file ? <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><span className="truncate text-[#28604f]">{file.fileName}</span><button type="button" className="text-[#8e3b32]" onClick={() => removeFile(rule.type)} aria-label={`Remove ${rule.type}`}><Trash2 className="size-4" /></button></div> : <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#07563f] underline decoration-[#f2d313] decoration-2 underline-offset-4"><UploadCloud className="size-4" /> Choose file<input type="file" className="sr-only" onChange={event => handleFile(rule.type, event)} /></label>}</div></div></div>; })}</div>
    <p className="mt-5 text-xs leading-5 text-[#7b8889]">Accepted uploads are stored as document metadata in ADMISSION_DOCUMENT and the file itself in private Supabase storage. Draft persistence is limited to 2 MB per file in this browser.</p>
  </StepShell>;
}

function StepFour({ draft, updateDraft }: { draft: ApplicationDraft; updateDraft: (patch: Partial<ApplicationDraft>) => void }) {
  return <StepShell eyebrow="Step 4 of 5" title="Exam registration" description="Choose the exam details you would like the admissions team to use.">
    <div className="grid gap-5 md:grid-cols-2"><Field label="Exam type" required><Select value={draft.examType} onChange={value => updateDraft({ examType: value })} options={EXAM_TYPE_OPTIONS} placeholder="Select exam type" /></Field><Field label="Exam date" required><Input type="date" value={draft.examDate} onChange={event => updateDraft({ examDate: event.target.value })} /></Field><Field label="Time slot" required><Select value={draft.examTimeSlot} onChange={value => updateDraft({ examTimeSlot: value })} options={EXAM_TIME_OPTIONS} placeholder="Select time slot" /></Field><Field label="Exam venue" required><Select value={draft.examVenue} onChange={value => updateDraft({ examVenue: value })} options={EXAM_VENUE_OPTIONS} placeholder="Select venue" /></Field></div>
  </StepShell>;
}

function StepFive({ draft, campuses, programs, documentRules }: { draft: ApplicationDraft; campuses: Array<{ campus_id: number; campus_name: string | null }>; programs: Array<{ program_id: number; program_name: string | null; college: string | null }>; documentRules: ReturnType<typeof getDocumentRules> }) {
  const campus = campuses.find(item => String(item.campus_id) === draft.campusId)?.campus_name ?? "Not selected";
  const program = programs.find(item => String(item.program_id) === draft.programId)?.program_name ?? "Not selected";
  return <StepShell eyebrow="Step 5 of 5" title="Review & submit" description="Review your information carefully. Submit only when everything looks correct.">
    <div className="grid gap-5 md:grid-cols-2"><ReviewSection title="Applicant" rows={[["Application type", draft.applicationType], ["LRN", draft.lrn], ["Name", [draft.firstName, draft.middleName, draft.lastName, draft.suffix].filter(Boolean).join(" ")], ["Sex", draft.sex], ["Civil status", draft.civilStatus], ["Birth date", draft.birthDate], ["Email", draft.email], ["Mobile", draft.mobile], ["Address", [draft.barangay, draft.city, draft.province, draft.region].filter(Boolean).join(", ")]]} /><ReviewSection title="Academic" rows={[["Strand / track", draft.strand], ["Previous school", draft.prevSchool], ["School address", draft.prevSchoolAddress], ["School type", draft.schoolType], ["Year graduated", draft.yearGraduated], ["GWA", draft.gwa], ["Honors", draft.honors], ["Campus", campus], ["Program", program]]} /><ReviewSection title="Exam" rows={[["Exam type", draft.examType], ["Date", draft.examDate], ["Time slot", draft.examTimeSlot], ["Venue", draft.examVenue]]} /><ReviewSection title="Documents" rows={documentRules.filter(rule => draft.documents[rule.type]).map(rule => [rule.required ? `${rule.type} · required` : rule.type, draft.documents[rule.type].fileName])} /></div>
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#dce2dc] bg-[#f7fbf8] p-4 text-sm leading-6 text-[#65747a]"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#28604f]" />Submitting will save your applicant details, create an admission application with status <strong className="text-[#07563f]">Pending</strong>, and record your uploaded document metadata.</div>
  </StepShell>;
}

function StepShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#087f5b]">{eyebrow}</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.03em] text-[#07563f] sm:text-4xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#65747a]">{description}</p><div className="mt-8 space-y-6">{children}</div></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}{required && <span className="ml-1 text-[#087f5b]">*</span>}</Label>{children}</div>;
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string }) {
  return <select className={selectClass} value={value} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(option => <option key={option}>{option}</option>)}</select>;
}

function ReviewSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <section className="rounded-2xl border border-[#dce2dc] bg-[#fbfcf9] p-5"><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#087f5b]">{title}</h3><dl className="mt-4 space-y-3">{rows.length ? rows.map(([label, value]) => <div className="grid grid-cols-[minmax(96px,0.45fr)_1fr] gap-3 text-sm" key={label}><dt className="text-[#8b9798]">{label}</dt><dd className="break-words font-medium text-[#07563f]">{value || "—"}</dd></div>) : <p className="text-sm text-[#8b9798]">No documents uploaded.</p>}</dl></section>;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ApplicationSkeleton() {
  return <main className="min-h-screen bg-[#f7fbf8] p-6"><div className="mx-auto max-w-[1180px] animate-pulse space-y-8"><div className="h-12 rounded-xl bg-[#e4e9e3]" /><div className="h-24 rounded-2xl bg-[#e4e9e3]" /><div className="h-[620px] rounded-2xl bg-white" /></div></main>;
}

const selectClass = "h-11 w-full rounded-xl border border-[#d5ded8] bg-white px-3 text-sm text-[#15232d] outline-none transition focus:border-[#9db7ab] focus:ring-2 focus:ring-[#d9ebe3]";
const textareaClass = "w-full rounded-xl border border-[#d5ded8] bg-white px-3 py-3 text-sm text-[#15232d] outline-none transition focus:border-[#9db7ab] focus:ring-2 focus:ring-[#d9ebe3]";
