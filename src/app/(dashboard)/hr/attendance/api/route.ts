
import { getRawAttendanceData } from "@/lib/hr-actions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
  }

  try {
    const data = await getRawAttendanceData(parseInt(year), parseInt(month));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch attendance data" }, { status: 500 });
  }
}
