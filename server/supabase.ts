import { ENV } from "./_core/env";

export type ApplicantRecord = {
  applicant_id: number;
  email: string | null;
  mobile: string | null;
  password_hash: string | null;
  is_verified: boolean | null;
};

export type AdmissionStatus = "Pending" | "Approved" | "Rejected" | "Waitlisted";
export type ApplicationType = "Freshmen" | "Transferee" | "Ladderized";

export type CampusRecord = { campus_id: number; campus_name: string | null };
export type ProgramRecord = { program_id: number; program_name: string | null; college: string | null };

type SupabaseRequestOptions = RequestInit & {
  parseJson?: boolean;
};

async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) {
    throw new Error("Supabase server configuration is missing");
  }

  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: ENV.supabaseServerKey,
      Authorization: `Bearer ${ENV.supabaseServerKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  if (options.parseJson === false || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getApplicantByEmail(email: string) {
  const query = new URLSearchParams({
    select: "applicant_id,email,mobile,password_hash,is_verified",
    email: `eq.${email}`,
    limit: "1",
  });

  const applicants = await supabaseRequest<ApplicantRecord[]>(
    `APPLICANT?${query.toString()}`,
  );

  return applicants[0] ?? null;
}

export async function insertApplicant(input: {
  email: string;
  mobile: string;
  passwordHash: string;
}) {
  const applicants = await supabaseRequest<ApplicantRecord[]>("APPLICANT", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      email: input.email,
      mobile: input.mobile,
      password_hash: input.passwordHash,
      is_verified: false,
    }),
  });

  return applicants[0] ?? null;
}

export async function getLatestAdmissionStatus(applicantId: number) {
  const query = new URLSearchParams({
    select: "admission_id,status",
    applicant_id: `eq.${applicantId}`,
    order: "admission_id.desc",
    limit: "1",
  });

  const applications = await supabaseRequest<Array<{ admission_id: number; status: AdmissionStatus | null }>>(
    `ADMISSION_APPLICATION?${query.toString()}`,
  );

  return applications[0]?.status ?? null;
}

export async function getCampuses() {
  const query = new URLSearchParams({
    select: "campus_id,campus_name",
    order: "campus_name.asc",
  });
  return supabaseRequest<CampusRecord[]>(`CAMPUS?${query.toString()}`);
}

export async function getPrograms() {
  const query = new URLSearchParams({
    select: "program_id,program_name,college",
    order: "program_name.asc",
  });
  return supabaseRequest<ProgramRecord[]>(`PROGRAM?${query.toString()}`);
}

export async function updateApplicantProfile(input: {
  applicantId: number;
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  suffix: string;
  sex: string;
  civilStatus: string;
  birthDate: string;
  email: string;
  mobile: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
}) {
  const query = new URLSearchParams({ applicant_id: `eq.${input.applicantId}` });
  const applicants = await supabaseRequest<ApplicantRecord[]>(`APPLICANT?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      lrn: input.lrn,
      last_name: input.lastName,
      first_name: input.firstName,
      middle_name: input.middleName,
      suffix: input.suffix,
      sex: input.sex,
      civil_status: input.civilStatus,
      birth_date: input.birthDate,
      email: input.email,
      mobile: input.mobile,
      region: input.region,
      province: input.province,
      city: input.city,
      barangay: input.barangay,
    }),
  });

  return applicants[0] ?? null;
}

export async function createAdmissionApplication(input: {
  applicantId: number;
  campusId: number;
  programId: number;
  applicationType: ApplicationType;
  strand: string;
  prevSchool: string;
  prevSchoolAddress: string;
  schoolType: string;
  yearGraduated: number;
  gwa: number;
  honors: string;
  examType: string;
  examDate: string;
  examTimeSlot: string;
  examVenue: string;
  admissionNo?: string;
}) {
  const applications = await supabaseRequest<Array<{ admission_id: number; status: AdmissionStatus | null }>>(
    "ADMISSION_APPLICATION",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        applicant_id: input.applicantId,
        campus_id: input.campusId,
        program_id: input.programId,
        application_type: input.applicationType,
        strand: input.strand,
        prev_school: input.prevSchool,
        prev_school_address: input.prevSchoolAddress,
        school_type: input.schoolType,
        year_graduated: input.yearGraduated,
        gwa: input.gwa,
        honors: input.honors,
        exam_type: input.examType,
        exam_date: input.examDate,
        exam_time_slot: input.examTimeSlot,
        exam_venue: input.examVenue,
        status: "Pending",
        ...(input.admissionNo ? { admission_no: input.admissionNo } : {}),
      }),
    },
  );

  return applications[0] ?? null;
}

const DOCUMENT_BUCKET = "admission-documents";

async function ensureDocumentBucket() {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) throw new Error("Supabase server configuration is missing");
  const response = await fetch(`${ENV.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: ENV.supabaseServerKey,
      Authorization: `Bearer ${ENV.supabaseServerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: DOCUMENT_BUCKET, name: DOCUMENT_BUCKET, public: false }),
  });
  if (!response.ok && response.status !== 409) {
    const body = await response.text();
    throw new Error(`Supabase storage bucket failed (${response.status}): ${body}`);
  }
}

export async function uploadAdmissionDocument(input: {
  admissionId: number;
  fileName: string;
  contentType: string;
  contentBase64: string;
}) {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) throw new Error("Supabase server configuration is missing");
  await ensureDocumentBucket();
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `admission-${input.admissionId}/${crypto.randomUUID()}-${safeFileName}`;
  const response = await fetch(`${ENV.supabaseUrl}/storage/v1/object/${DOCUMENT_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: ENV.supabaseServerKey,
      Authorization: `Bearer ${ENV.supabaseServerKey}`,
      "Content-Type": input.contentType || "application/octet-stream",
      "x-upsert": "false",
    },
    body: Buffer.from(input.contentBase64, "base64"),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase document upload failed (${response.status}): ${body}`);
  }
  return `${DOCUMENT_BUCKET}/${objectPath}`;
}

export async function insertAdmissionDocuments(documents: Array<{
  admissionId: number;
  docType: string;
  fileName: string;
  fileSizeBytes: number;
  filePath: string;
}>) {
  if (documents.length === 0) return [];
  return supabaseRequest<Array<{ document_id: number }>>("ADMISSION_DOCUMENT", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(documents.map(document => ({
      admission_id: document.admissionId,
      doc_type: document.docType,
      file_name: document.fileName,
      file_size_bytes: document.fileSizeBytes,
      file_path: document.filePath,
      status: "Pending",
    }))),
  });
}
