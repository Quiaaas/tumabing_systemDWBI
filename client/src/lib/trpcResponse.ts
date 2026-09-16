export async function fetchTrpcResponse(input: RequestInfo | URL, init?: RequestInit) {
  const response = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });
  const body = await response.text();
  const messageFromBody = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "error" in value) {
      const error = (value as { error?: unknown }).error;
      if (typeof error === "string") return error;
      if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
        return (error as { message: string }).message;
      }
    }
    return `Request failed with status ${response.status}`;
  };

  try {
    const parsed: unknown = JSON.parse(body);
    const isTrpcBatch = Array.isArray(parsed) && parsed.every(item => item && typeof item === "object" && ("result" in item || "error" in item));
    if (isTrpcBatch) {
      return new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } });
    }
    const message = messageFromBody(parsed).replace(/\s+/g, " ").trim().slice(0, 240);
    const payload = [{ error: { json: { message, code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: response.status } } } }];
    return new Response(JSON.stringify(payload), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    const message = messageFromBody(body).replace(/\s+/g, " ").trim().slice(0, 240);
    const payload = [{ error: { json: { message, code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: response.status } } } }];
    return new Response(JSON.stringify(payload), { status: response.status, headers: { "Content-Type": "application/json" } });
  }
}
