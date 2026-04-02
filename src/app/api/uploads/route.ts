import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/libs/auth";

const ONE_MB = 1024 * 1024;
const MAX_TOTAL_FILES_PER_REQUEST = 6;
const MAX_IMAGE_FILES_PER_REQUEST = 3;
const MAX_NON_IMAGE_FILES_PER_REQUEST = 3;

const IMAGE_FILE_MAX_BYTES = ONE_MB;
const NON_IMAGE_FILE_MAX_BYTES = 5 * ONE_MB;

type FileCategory = "image" | "file";

const FILE_CATEGORY_BY_EXTENSION: Record<string, FileCategory> = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".pdf": "file",
  ".doc": "file",
  ".docx": "file",
  ".xls": "file",
  ".xlsx": "file",
  ".csv": "file",
  ".txt": "file",
};

const EXTENSION_MIME_ALLOWLIST: Record<string, string[]> = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".csv": ["text/csv", "application/csv", "application/vnd.ms-excel"],
  ".txt": ["text/plain"],
};

const getMaxFileSizeByCategory = (category: FileCategory): number => {
  if (category === "image") return IMAGE_FILE_MAX_BYTES;
  return NON_IMAGE_FILE_MAX_BYTES;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= ONE_MB) {
    const mb = bytes / ONE_MB;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
  }
  return `${Math.ceil(bytes / 1024)}KB`;
};

// generate unique file name
function generateUniqueFileName(originalName: string, category: FileCategory) {
  const ext = path.extname(originalName).toLowerCase();
  const prefix = category === "image" ? "img" : "file";
  return `${prefix}-${uuidv4()}${ext}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const uploadRootDir = path.join(process.cwd(), "uploads");
  const uploadImageDir = path.join(uploadRootDir, "images");
  const uploadFileDir = path.join(uploadRootDir, "files");

  // create folder if not exists
  try {
    await Promise.all([
      fs.mkdir(uploadRootDir, { recursive: true }),
      fs.mkdir(uploadImageDir, { recursive: true }),
      fs.mkdir(uploadFileDir, { recursive: true }),
    ]);
  } catch { }

  const formData = await req.formData();
  const files = formData.getAll("file");
  if (!files.length) {
    return NextResponse.json(
      { success: false, error: "No file uploaded" },
      { status: 400 },
    );
  }
  if (files.length > MAX_TOTAL_FILES_PER_REQUEST) {
    return NextResponse.json(
      {
        success: false,
        error: `You can upload up to ${MAX_TOTAL_FILES_PER_REQUEST} files per request.`,
      },
      { status: 400 },
    );
  }

  const urls: string[] = [];
  let imageFilesCount = 0;
  let nonImageFilesCount = 0;

  for (const file of files) {
    if (file instanceof File) {
      const extension = path.extname(file.name).toLowerCase();
      const category = FILE_CATEGORY_BY_EXTENSION[extension];
      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error:
              `${file.name} has unsupported file extension. ` +
              "Allowed: PNG, JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT.",
          },
          { status: 400 },
        );
      }

      const normalizedMime = file.type.trim().toLowerCase();
      const allowedMimes = EXTENSION_MIME_ALLOWLIST[extension] ?? [];
      if (normalizedMime && !allowedMimes.includes(normalizedMime)) {
        return NextResponse.json(
          {
            success: false,
            error: `${file.name} has unsupported MIME type (${normalizedMime}).`,
          },
          { status: 400 },
        );
      }

      if (category === "image") {
        imageFilesCount += 1;
        if (imageFilesCount > MAX_IMAGE_FILES_PER_REQUEST) {
          return NextResponse.json(
            {
              success: false,
              error: `You can upload up to ${MAX_IMAGE_FILES_PER_REQUEST} images.`,
            },
            { status: 400 },
          );
        }
      } else {
        nonImageFilesCount += 1;
        if (nonImageFilesCount > MAX_NON_IMAGE_FILES_PER_REQUEST) {
          return NextResponse.json(
            {
              success: false,
              error: `You can upload up to ${MAX_NON_IMAGE_FILES_PER_REQUEST} files.`,
            },
            { status: 400 },
          );
        }
      }

      const maxSizeForFile = getMaxFileSizeByCategory(category);
      const categoryLabel = category === "image" ? "image" : "file";
      if (file.size > maxSizeForFile) {
        return NextResponse.json(
          {
            success: false,
            error:
              `${file.name} exceeds ${formatBytes(maxSizeForFile)} size limit ` +
              `for ${categoryLabel}.`,
          },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = generateUniqueFileName(file.name, category);
      const targetDir = category === "image" ? uploadImageDir : uploadFileDir;
      const filepath = path.join(targetDir, filename);

      await fs.writeFile(filepath, buffer);
      urls.push(`/api/uploads/${filename}`);
    }
  }

  return NextResponse.json({ success: true, urls });
}
