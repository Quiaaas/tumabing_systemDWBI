import type { Request, Response } from "express";
import { createApp } from "../../server/_core/app";

let app: ReturnType<typeof createApp> | null = null;
let initializationError: unknown = null;

try {
  app = createApp();
} catch (error) {
  initializationError = error;
  console.error("[Vercel] API initialization failed:", error);
}

export default function handler(req: Request, res: Response) {
  if (initializationError || !app) {
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "API initialization failed." }));
    return;
  }

  try {
    app(req, res);
  } catch (error) {
    console.error("[Vercel] API invocation failed:", error);
    if (!res.headersSent) {
      res.status(500).setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "API invocation failed." }));
    }
  }
}
