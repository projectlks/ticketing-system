// import { NextResponse } from 'next/server';
// import fs from 'fs';
// import path from 'path';

// export const config = {
//     api: {
//         bodyParser: false,
//     },
// };

// export async function POST(req: Request) {
//     const uploadDir = path.join(process.cwd(), 'public', 'uploads');
//     if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     const formData = await req.formData();
//     const files = formData.getAll('file');

//     const urls: string[] = [];

//     for (const file of files) {
//         if (file instanceof File) {
//             const arrayBuffer = await file.arrayBuffer();
//             const buffer = Buffer.from(arrayBuffer);
//             const filename = `${Date.now()}_${file.name}`;
//             const filepath = path.join(uploadDir, filename);

//             fs.writeFileSync(filepath, buffer);
//             urls.push(`/uploads/${filename}`);
//         }
//     }

//     return NextResponse.json({ urls });
// }

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: Request) {
  const uploadDir = path.join(process.cwd(), 'uploads');

  // folder မရှိရင် create
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch {}

  const formData = await req.formData();
  const files = formData.getAll('file');

  const urls: string[] = [];

  for (const file of files) {
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name; // original file name
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);
      urls.push(`/api/uploads/${filename}`);
    }
  }

  return NextResponse.json({ urls });
}

