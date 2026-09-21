import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchSymbols } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchSymbols(q);
  return NextResponse.json({ results });
}
