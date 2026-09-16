import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestAdmissionStatus } from "./supabase";

describe("getLatestAdmissionStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the latest application status for the applicant", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ admission_id: 12, status: "Approved" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getLatestAdmissionStatus(7)).resolves.toBe("Approved");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/ADMISSION_APPLICATION?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer "),
          apikey: expect.any(String),
        }),
      }),
    );
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("applicant_id=eq.7");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("order=admission_id.desc");
  });

  it("returns null when the applicant has no applications", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
    );

    await expect(getLatestAdmissionStatus(7)).resolves.toBeNull();
  });
});
