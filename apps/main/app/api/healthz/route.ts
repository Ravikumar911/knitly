import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { dbPath } from "@workspace/database";

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: pkg.version,
    mode: "local",
    dbPath,
  });
}
