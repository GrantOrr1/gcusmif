import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRecurringEvents } from "@/lib/recurringEvents";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(listRecurringEvents());
}
