import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';



import { v4 as uuidv4 } from 'uuid'; // optional for UUID method

export const config = {
  api: { bodyParser: false },
};

// Function to generate unique file name
function generateUniqueFileName(originalName: string) {
  const timestamp = Date.now(); // current timestamp
  const random = Math.floor(Math.random() * 10000); // random number to avoid collisions
  const ext = originalName.split('.').pop(); // get file extension
  return `${timestamp}-${random}.${ext}`;

  // Alternative with UUID
  // return `${uuidv4()}.${ext}`;
}


export async function POST(req: Request) {
  const uploadDir = path.join(process.cwd(), 'uploads');

  // folder မရှိရင် create
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch { }

  const formData = await req.formData();
  const files = formData.getAll('file');

  const urls: string[] = [];

  for (const file of files) {
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = generateUniqueFileName(file.name);
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);
      urls.push(`/api/uploads/${filename}`);
    }
  }

  return NextResponse.json({ urls });
}

