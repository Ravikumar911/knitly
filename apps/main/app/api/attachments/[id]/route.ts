import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import {
  getTransactionWithEmail,
  LOCAL_USER_ID,
  parseAttachmentStoragePaths,
} from "@workspace/database";
import { attachmentsRoot } from "@workspace/tasks/utils/attachments-fs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const transaction = await getTransactionWithEmail(id, LOCAL_USER_ID);

  if (!transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 },
    );
  }

  const [storedPath] = parseAttachmentStoragePaths(
    transaction.attachmentStoragePath,
  );
  if (!storedPath) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }

  const root = resolve(attachmentsRoot());
  const filePath = resolve(storedPath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return NextResponse.json(
      { error: "Attachment path is outside the local attachments directory" },
      { status: 403 },
    );
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    const content = await readFile(filePath);
    return new Response(content, {
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }
}

function contentType(path: string) {
  switch (extname(path).toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
