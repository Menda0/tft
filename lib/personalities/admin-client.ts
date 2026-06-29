export async function prunePlayerPersonalitiesRequest(
  token: string,
): Promise<
  | {
      ok: true;
      data: {
        personalities: number;
        posts: number;
        follows: number;
        postReads: number;
      };
    }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/personalities/prune", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    personalities?: number;
    posts?: number;
    follows?: number;
    postReads?: number;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return {
    ok: true,
    data: {
      personalities: data.personalities ?? 0,
      posts: data.posts ?? 0,
      follows: data.follows ?? 0,
      postReads: data.postReads ?? 0,
    },
  };
}
