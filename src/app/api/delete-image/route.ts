import { deleteImageByUrl } from '@/libs/imageUtils';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url'); // URL query parameter

    if (!imageUrl) {
        return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const deleted = deleteImageByUrl(imageUrl);


    console.log("this is call")

    if (deleted) {
        return NextResponse.json({ success: true, message: "Image deleted" });
    } else {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
