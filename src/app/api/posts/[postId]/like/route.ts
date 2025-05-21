
// src/app/api/posts/[postId]/like/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost } from '@/types';

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'community_db.json');

async function readDb(): Promise<{ posts: CommunityPost[] }> {
  try {
    await fs.access(DB_FILE_PATH);
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    if (data.trim() === '') return { posts: [] };
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
      await fs.writeFile(DB_FILE_PATH, JSON.stringify({ posts: [] }, null, 2), 'utf-8');
      return { posts: [] };
    }
    console.error('[API DB] Error reading database file:', error);
    throw new Error('Failed to read database');
  }
}

async function writeDb(data: { posts: CommunityPost[] }) {
  try {
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API DB] Error writing to database file:', error);
    throw new Error('Failed to write to database');
  }
}

// PUT /api/posts/[postId]/like
export async function PUT(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  console.log(`[API PUT /posts/${postId}/like] Received request to like post ID: ${postId}`);

  if (!postId) {
    console.warn('[API PUT /posts/:id/like] Post ID is missing from request.');
    return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
  }

  try {
    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      console.warn(`[API PUT /posts/${postId}/like] Post with ID ${postId} not found for liking. Current post IDs in DB: [${db.posts.map(p => p.id).join(', ')}]`);
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    db.posts[postIndex].likes = (db.posts[postIndex].likes || 0) + 1;
    await writeDb(db);
    console.log(`[API PUT /posts/${postId}/like] Post liked successfully. New like count: ${db.posts[postIndex].likes}`);
    return NextResponse.json(db.posts[postIndex], { status: 200 });
  } catch (error: any) {
    console.error(`[API PUT /posts/${postId}/like] Error liking post:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to like post due to a server error.', error: error.message }, { status: 500 });
  }
}
