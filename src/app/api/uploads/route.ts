import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/libs/auth";

const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024; // 1MB
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);


// generate unique file name
function generateUniqueFileName(originalName: string) {
  const ext = originalName.split(".").pop();
  return `${uuidv4()}.${ext}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const uploadDir = path.join(process.cwd(), "uploads");

  // create folder if not exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch { }

  const formData = await req.formData();
  const files = formData.getAll("file");
  if (!files.length) {
    return NextResponse.json(
      { success: false, error: "No file uploaded" },
      { status: 400 },
    );
  }

  const urls: string[] = [];

  for (const file of files) {
    if (file instanceof File) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { success: false, error: `${file.name} has unsupported file type.` },
          { status: 400 },
        );
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: `${file.name} exceeds 1MB size limit.` },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = generateUniqueFileName(file.name);
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);
      urls.push(`/api/uploads/${filename}`);
    }
  }

  return NextResponse.json({ success: true, urls });
}
