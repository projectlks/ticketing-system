import { NextResponse, type NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

interface Params {
  filename: string;
}

// GET /api/uploads/[filename]
export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  // Wrap in Promise.resolve to satisfy Next.js type system
  const routeParams = await Promise.resolve(params);
  const filename = routeParams.filename;
  if (!filename) return new NextResponse("filename required", { status: 400 });

  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), "uploads", safeName);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Convert Buffer to Uint8Array for NextResponse body
    const body = new Uint8Array(fileBuffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
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
  { params }: { params: Params }
) {
  const routeParams = await Promise.resolve(params);
  const filename = routeParams.filename;
  if (!filename)
    return NextResponse.json(
      { success: false, message: "filename required" },
      { status: 400 }
    );

  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), "uploads", safeName);

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
