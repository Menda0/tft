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

export async function cleanSlatePersonalitySocialRequest(
  token: string,
): Promise<
  | {
      ok: true;
      data: {
        posts: number;
        follows: number;
        postReads: number;
        activities: number;
        personalitiesReset: number;
        npcsReset: number;
        worldReset: boolean;
      };
    }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/personalities/clean-slate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    posts?: number;
    follows?: number;
    postReads?: number;
    activities?: number;
    personalitiesReset?: number;
    npcsReset?: number;
    worldReset?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return {
    ok: true,
    data: {
      posts: data.posts ?? 0,
      follows: data.follows ?? 0,
      postReads: data.postReads ?? 0,
      activities: data.activities ?? 0,
      personalitiesReset: data.personalitiesReset ?? 0,
      npcsReset: data.npcsReset ?? 0,
      worldReset: data.worldReset ?? false,
    },
  };
}
