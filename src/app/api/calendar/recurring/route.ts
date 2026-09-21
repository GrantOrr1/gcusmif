import { NextResponse } from "next/server";
import { listRecurringEvents } from "@/lib/recurringEvents";

export async function GET() {
  return NextResponse.json(listRecurringEvents());
}
