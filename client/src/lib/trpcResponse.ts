export async function fetchTrpcResponse(input: RequestInfo | URL, init?: RequestInit) {
  const response = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });
  const body = await response.text();
  try {
    JSON.parse(body);
    return new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    const message = body.replace(/\s+/g, " ").trim().slice(0, 240) || `Request failed with status ${response.status}`;
    const payload = [{ error: { json: { message, code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: response.status } } } }];
    return new Response(JSON.stringify(payload), { status: response.status, headers: { "Content-Type": "application/json" } });
  }
}
