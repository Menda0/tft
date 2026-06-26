import { NextResponse } from "next/server";

import type { PublicUser } from "@/lib/db/users";

export type AuthResponse = {
  user: PublicUser;
  token: string;
};

export function authSuccess(user: PublicUser, token: string, status = 200) {
  return NextResponse.json({ user, token } satisfies AuthResponse, { status });
}

export function authError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
