// lib/fileUtils.ts
import fs from 'fs';
import path from 'path';

export function deleteImageByUrl(url: string): boolean {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filename = path.basename(url);
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  } else {
    return false;
  }
}
