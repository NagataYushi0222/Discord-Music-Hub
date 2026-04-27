import { badRequest, json } from "../../_lib/http";
import type { Env } from "../../_lib/types";
import { fetchYoutubeMetadata } from "../../_lib/youtube";

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return badRequest("url query is required.");
  }

  try {
    return json(await fetchYoutubeMetadata(url));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid URL.");
  }
};
