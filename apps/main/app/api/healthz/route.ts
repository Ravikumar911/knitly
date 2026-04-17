import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { dbPath, ensureLocalDatabase } from "@workspace/database";

export async function GET() {
  ensureLocalDatabase();

  return NextResponse.json({
    ok: true,
    version: pkg.version,
    mode: "local",
    dbPath,
  });
}
