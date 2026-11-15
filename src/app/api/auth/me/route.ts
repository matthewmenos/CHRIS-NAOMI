import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ staff });
}
