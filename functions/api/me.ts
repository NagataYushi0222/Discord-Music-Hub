import { getCurrentUser } from "../_lib/auth";
import { json, unauthorized } from "../_lib/http";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getCurrentUser(request, env);
  return user ? json(user) : unauthorized();
};
