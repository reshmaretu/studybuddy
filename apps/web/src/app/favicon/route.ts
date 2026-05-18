import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const faviconPath = join(process.cwd(), 'public/assets/favicon.png');
        const imageBuffer = await readFile(faviconPath);
        
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Favicon route error:', error);
        return new NextResponse('Not found', { status: 404 });
    }
}

export const dynamic = 'force-static';
export const revalidate = 0;
