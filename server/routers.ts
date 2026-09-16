import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { clearApplicantSession, createApplicantSession, hashPassword, readApplicantSession, setApplicantSession, verifyPassword } from "./applicantAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getApplicantByEmail, getLatestAdmissionStatus, insertApplicant } from "./supabase";

const credentialsInput = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const registerInput = credentialsInput.extend({
  mobile: z.string().trim().min(7, "Enter a valid mobile number").max(32),
});

function publicApplicant(applicant: {
  applicant_id: number;
  email: string | null;
  mobile: string | null;
  is_verified: boolean | null;
}) {
  return {
    applicantId: applicant.applicant_id,
    email: applicant.email,
    mobile: applicant.mobile,
    isVerified: Boolean(applicant.is_verified),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  applicantAuth: router({
    register: publicProcedure.input(registerInput).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const existing = await getApplicantByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }

      try {
        const applicant = await insertApplicant({
          email,
          mobile: input.mobile,
          passwordHash: await hashPassword(input.password),
        });
        if (!applicant) throw new Error("Applicant record was not returned after registration");

        setApplicantSession(ctx.res, ctx.req, await createApplicantSession({
          applicantId: applicant.applicant_id,
          email,
        }));

        return { applicant: publicApplicant(applicant), message: "Registration successful." };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[ApplicantAuth] Registration failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not create your account. Please try again." });
      }
    }),

    login: publicProcedure.input(credentialsInput).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const applicant = await getApplicantByEmail(email);
      if (!applicant?.password_hash || !(await verifyPassword(input.password, applicant.password_hash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      }

      setApplicantSession(ctx.res, ctx.req, await createApplicantSession({
        applicantId: applicant.applicant_id,
        email,
      }));

      return { applicant: publicApplicant(applicant), message: "Login successful." };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const session = await readApplicantSession(ctx.req);
      if (!session) return null;

      const applicant = await getApplicantByEmail(session.email);
      if (!applicant || applicant.applicant_id !== session.applicantId) {
        clearApplicantSession(ctx.res, ctx.req);
        return null;
      }

      return {
        ...publicApplicant(applicant),
        currentAdmissionStatus: await getLatestAdmissionStatus(applicant.applicant_id),
      };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearApplicantSession(ctx.res, ctx.req);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
