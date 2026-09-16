import type { Request, Response } from "express";

type ExpressHandler = (req: Request, res: Response) => unknown;
let appPromise: Promise<ExpressHandler> | null = null;

function loadApp() {
  appPromise ??= import("../../server/_core/app").then(({ createApp }) => createApp() as ExpressHandler);
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await loadApp();
    await Promise.resolve(app(req, res));
  } catch (error) {
    console.error("[Vercel] tRPC function failed:", error);
    if (!res.headersSent) {
      res.status(500).setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "API request failed." }));
    }
  }
}
