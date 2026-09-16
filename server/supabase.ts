import { ENV } from "./_core/env";

export type ApplicantRecord = {
  applicant_id: number;
  email: string | null;
  mobile: string | null;
  password_hash: string | null;
  is_verified: boolean | null;
};

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
