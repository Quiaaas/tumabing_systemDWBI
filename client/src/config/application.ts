export const APPLICATION_TYPES = ["Freshmen", "Transferee", "Ladderized"] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

export const SEX_OPTIONS = ["Female", "Male", "Prefer not to say"] as const;
export const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"] as const;
export const SCHOOL_TYPE_OPTIONS = ["Public", "Private"] as const;
export const EXAM_TYPE_OPTIONS = ["Admission Exam", "Online Admission Exam"] as const;
export const EXAM_TIME_OPTIONS = ["8:00 AM – 10:00 AM", "10:30 AM – 12:30 PM", "1:30 PM – 3:30 PM"] as const;
export const EXAM_VENUE_OPTIONS = ["Main Campus Testing Center", "Online Proctored Exam"] as const;

export type DocumentRule = {
  type: string;
  required: boolean;
  note?: string;
};

export function getDocumentRules(applicationType: ApplicationType): DocumentRule[] {
  if (applicationType === "Freshmen") {
    return [
      { type: "Form 138/Report Card", required: true },
      { type: "PSA Birth Certificate", required: true },
      { type: "Good Moral Certificate", required: true },
      { type: "2x2 Photo", required: true },
      { type: "SHS Diploma", required: false, note: "Optional — upload only if already graduated." },
    ];
  }

  if (applicationType === "Transferee") {
    return [
      { type: "Transcript of Records", required: true },
      { type: "Honorable Dismissal/Transfer Credential", required: true },
      { type: "Good Moral Certificate", required: true },
      { type: "PSA Birth Certificate", required: true },
      { type: "2x2 Photo", required: true },
      { type: "SHS Diploma", required: false, note: "Conditional — upload if graduation is not confirmed on the Transcript of Records." },
    ];
  }

  return [
    { type: "Certificate/Diploma from previous ladder level", required: true },
    { type: "Transcript of Records", required: true },
    { type: "Good Moral Certificate", required: true },
    { type: "PSA Birth Certificate", required: true },
    { type: "2x2 Photo", required: true },
    { type: "SHS Diploma", required: false, note: "Conditional — upload only if entering straight from SHS." },
    { type: "Transfer Credentials", required: false, note: "Conditional — upload only if crediting units from another institution." },
  ];
}

export const EMPTY_APPLICATION_DRAFT = {
  applicationType: "Freshmen" as ApplicationType,
  lrn: "",
  lastName: "",
  firstName: "",
  middleName: "",
  suffix: "",
  sex: "",
  civilStatus: "",
  birthDate: "",
  email: "",
  mobile: "",
  region: "",
  regionCode: "",
  province: "",
  provinceCode: "",
  city: "",
  cityCode: "",
  barangay: "",
  barangayCode: "",
  strand: "",
  prevSchool: "",
  prevSchoolAddress: "",
  schoolType: "",
  yearGraduated: "",
  gwa: "",
  honors: "",
  campusId: "",
  programId: "",
  examType: "",
  examDate: "",
  examTimeSlot: "",
  examVenue: "",
  documents: {} as Record<string, { fileName: string; fileSizeBytes: number; contentType: string; contentBase64: string }>,
};

export type ApplicationDraft = Omit<typeof EMPTY_APPLICATION_DRAFT, "applicationType"> & {
  applicationType: ApplicationType;
};
