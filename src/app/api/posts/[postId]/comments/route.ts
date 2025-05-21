
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost, Comment } from '@/types';

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'community_db.json');

async function readDb(): Promise<{ posts: CommunityPost[] }> {
  try {
    await fs.access(DB_FILE_PATH);
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    if (data.trim() === '') {
      console.log('[API DB] Comments: Database file is empty, returning default.');
      return { posts: [] };
    }
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`[API DB] Comments: Database file ${DB_FILE_PATH} not found, creating with default structure.`);
      await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
      const defaultDb = { posts: [] };
      await writeDb(defaultDb);
      return defaultDb;
    }
    console.error('[API DB] Comments: Error reading database file:', error);
    throw new Error('Failed to read database for comments');
  }
}

async function writeDb(data: { posts: CommunityPost[] }) {
  try {
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API DB] Comments: Error writing to database file:', error);
    throw new Error('Failed to write to database for comments');
  }
}

// POST /api/posts/[postId]/comments - Add a comment to a post
export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  console.log(`[API POST /posts/${postId}/comments] Received request to add comment.`);

  if (!postId) {
    console.warn('[API POST /posts/:id/comments] Post ID is missing.');
    return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
  }

  try {
    const commentData = await request.json();
    const { userId, userName, userAvatarUrl, text } = commentData;

    if (!userId || !userName || !text) {
      console.warn(`[API POST /posts/${postId}/comments] Missing required fields for comment (userId, userName, text). Received:`, commentData);
      return NextResponse.json({ message: 'Missing required fields for comment (userId, userName, text)' }, { status: 400 });
    }

    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      console.warn(`[API POST /posts/${postId}/comments] Post with ID ${postId} not found.`);
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    const newComment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      userName,
      userAvatarUrl, // This will be the path if processed by avatar upload, or original if not
      text,
      timestamp: Date.now(),
    };

    if (!db.posts[postIndex].comments) {
      db.posts[postIndex].comments = [];
    }
    db.posts[postIndex].comments.push(newComment);
    db.posts[postIndex].commentCount = db.posts[postIndex].comments.length;

    await writeDb(db);
    console.log(`[API POST /posts/${postId}/comments] Comment added successfully to post ${postId}.`);
    return NextResponse.json(db.posts[postIndex], { status: 201 }); // Return the updated post

  } catch (error: any) {
    console.error(`[API POST /posts/${postId}/comments] Error adding comment:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to add comment due to a server error.', error: error.message }, { status: 500 });
  }
}
