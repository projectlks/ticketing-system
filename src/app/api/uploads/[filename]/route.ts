import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/libs/auth";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

const INLINE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IMAGE_FILE_PREFIX = "img-";
const NON_IMAGE_FILE_PREFIX = "file-";

interface Params {
  filename: string;
}

const resolveUploadFilePath = (safeName: string): string => {
  const uploadRootDir = path.join(process.cwd(), "uploads");

  if (safeName.startsWith(IMAGE_FILE_PREFIX)) {
    return path.join(uploadRootDir, "images", safeName);
  }
  if (safeName.startsWith(NON_IMAGE_FILE_PREFIX)) {
    return path.join(uploadRootDir, "files", safeName);
  }

  // Backward compatibility for old uploads stored directly under uploads/
  return path.join(uploadRootDir, safeName);
};

async function ensureAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// GET /api/uploads/[filename]
export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const unauthorizedResponse = await ensureAuthenticated();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { filename } = await context.params;

  if (!filename) return new NextResponse("filename required", { status: 400 });

  const safeName = path.basename(filename);
  const filePath = resolveUploadFilePath(safeName);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const isInline = INLINE_EXTENSIONS.has(ext);
    const contentDisposition = isInline
      ? "inline"
      : `attachment; filename=\"${encodeURIComponent(safeName)}\"`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}

// DELETE /api/uploads/[filename]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const unauthorizedResponse = await ensureAuthenticated();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { filename } = await context.params;

  if (!filename)
    return NextResponse.json(
      { success: false, message: "filename required" },
      { status: 400 }
    );

  const safeName = path.basename(filename);
  const filePath = resolveUploadFilePath(safeName);

  try {
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "File not found" },
      { status: 404 }
    );
  }
}
