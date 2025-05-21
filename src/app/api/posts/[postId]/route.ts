
// src/app/api/posts/[postId]/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost } from '@/types';

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'community_db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public');

async function readDb(): Promise<{ posts: CommunityPost[] }> {
  try {
    await fs.access(DB_FILE_PATH);
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    if (data.trim() === '') {
      console.log('[API DB] Database file is empty, returning default.');
      return { posts: [] };
    }
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`[API DB] Database file ${DB_FILE_PATH} not found, creating with default structure.`);
      await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
      await fs.writeFile(DB_FILE_PATH, JSON.stringify({ posts: [] }, null, 2), 'utf-8');
      return { posts: [] };
    }
    console.error('[API DB] Error reading database file:', error);
    // In case of other errors, to prevent API crash, return empty or throw specific error.
    // For now, rethrowing to indicate a server-side issue.
    throw new Error('Failed to read database due to an unexpected error.');
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

async function deleteAssociatedImage(imagePath?: string) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return; // Only delete images we manage

  try {
    const fullPath = path.join(UPLOADS_DIR, imagePath);
    await fs.access(fullPath); // Check if file exists
    await fs.unlink(fullPath);
    console.log(`[API DELETE /posts/:id] Deleted image: ${fullPath}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`[API DELETE /posts/:id] Image not found, no need to delete: ${imagePath}`);
    } else {
      console.error(`[API DELETE /posts/:id] Error deleting image ${imagePath}:`, error);
    }
  }
}


// DELETE /api/posts/[postId]
export async function DELETE(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  console.log(`[API DELETE /posts/${postId}] Received request to delete post ID: ${postId}`);

  if (!postId) {
    console.warn('[API DELETE /posts/:id] Post ID is missing from request.');
    return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
  }

  try {
    const db = await readDb();
    const postToDelete = db.posts.find(post => post.id === postId);

    if (!postToDelete) {
      console.log(`[API DELETE /posts/${postId}] Post with ID ${postId} not found. Current post IDs in DB: [${db.posts.map(p => p.id).join(', ')}]`);
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    // Delete associated images before removing the post from DB
    await deleteAssociatedImage(postToDelete.userAvatarUrl);
    await deleteAssociatedImage(postToDelete.associatedPersonaAvatarUrl);

    db.posts = db.posts.filter(post => post.id !== postId);

    await writeDb(db);
    console.log(`[API DELETE /posts/${postId}] Post with ID ${postId} deleted successfully.`);
    return NextResponse.json({ message: 'Post deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`[API DELETE /posts/${postId}] Error deleting post:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to delete post due to a server error.', error: error.message }, { status: 500 });
  }
}
