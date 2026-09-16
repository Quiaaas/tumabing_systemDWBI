export const DASHBOARD_CONFIG = {
  enrollmentPeriod: {
    label: "Enrollment period",
    value: "June 10 – August 30, 2026",
    detail: "Online enrollment opens after admission approval.",
  },
  examSchedule: {
    label: "Exam schedules",
    value: "July 18 & August 8, 2026",
    detail: "Admission exam schedules will appear here once assigned.",
  },
  hotline: {
    label: "Applicant hotline",
    value: "+63 2 8123 4567",
    detail: "Mon–Fri · 8:00 AM–5:00 PM",
  },
  announcements: [
    {
      date: "June 02, 2026",
      tag: "Admissions",
      title: "Applications for the 2026–2027 academic year are open.",
      body: "Complete your admission application early so there is time to review your documents.",
    },
    {
      date: "May 28, 2026",
      tag: "Reminder",
      title: "Use an active mobile number in your applicant profile.",
      body: "We will use your registered contact details for important application updates.",
    },
    {
      date: "May 20, 2026",
      tag: "Campus note",
      title: "Exam schedules will be posted as soon as they are assigned.",
      body: "Keep checking your dashboard for your venue, date, and time slot.",
    },
  ],
} as const;
