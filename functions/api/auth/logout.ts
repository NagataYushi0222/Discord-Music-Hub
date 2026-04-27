import { SESSION_COOKIE, clearCookie, deleteSession } from "../../_lib/auth";
import { json } from "../../_lib/http";
import type { Env } from "../../_lib/types";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await deleteSession(request, env);
  const secure = new URL(request.url).protocol === "https:";
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearCookie(SESSION_COOKIE, secure),
      },
    },
  );
};
