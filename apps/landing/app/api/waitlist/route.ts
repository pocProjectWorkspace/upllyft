import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

interface WaitlistEntry {
  email: string;
  role: string;
  timestamp: string;
}

const DATA_FILE = join(process.cwd(), "waitlist-data.json");

async function getEntries(): Promise<WaitlistEntry[]> {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data) as WaitlistEntry[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; role?: string };

    if (!body.email || !body.role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const entry: WaitlistEntry = {
      email: body.email,
      role: body.role,
      timestamp: new Date().toISOString(),
    };

    // Log to console
    console.log("[Waitlist Signup]", entry);

    // Persist to JSON file
    const entries = await getEntries();
    entries.push(entry);
    await writeFile(DATA_FILE, JSON.stringify(entries, null, 2));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
