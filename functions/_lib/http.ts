export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("JSON body is required.");
  }
}
