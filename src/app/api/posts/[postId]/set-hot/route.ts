
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost } from '@/types';
import { ADMIN_USER_ID } from '@/lib/constants';

const DB_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'data'); // Adjusted path
const DB_FILE_PATH = path.join(DB_DIR, 'community_db.json');


async function readDb(): Promise<{ posts: CommunityPost[] }> {
  try {
    await fs.access(DB_FILE_PATH);
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    if (data.trim() === '') return { posts: [] };
    const parsedData = JSON.parse(data);
    const postsWithDefaults = (parsedData.posts || []).map((post: any) => ({
      ...post,
      comments: post.comments || [],
      commentCount: post.comments?.length || 0,
      likes: post.likes || 0,
      isRecommended: post.isRecommended || false,
      isManuallyHot: post.isManuallyHot || false,
    }));
    return { posts: postsWithDefaults };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(DB_DIR, { recursive: true }).catch(console.error); // Ensure DB_DIR exists
      const defaultDb = { posts: [] };
      await fs.writeFile(DB_FILE_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8').catch(console.error);
      return defaultDb;
    }
    console.error('[API DB SetHot] Error reading database file:', error);
    throw new Error('Failed to read database for set-hot');
  }
}

async function writeDb(data: { posts: CommunityPost[] }) {
  try {
    await fs.mkdir(DB_DIR, { recursive: true }); // Ensure DB_DIR exists
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API DB SetHot] Error writing to database file:', error);
    throw new Error('Failed to write to database for set-hot');
  }
}

// PUT /api/posts/[postId]/set-hot
export async function PUT(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  console.log(`[API PUT /posts/${postId}/set-hot] Received request to toggle manual hot status.`);

  if (!postId) {
    return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { isHot, userId } = body;

    if (typeof isHot !== 'boolean') {
      return NextResponse.json({ message: 'Invalid "isHot" value. Must be boolean.' }, { status: 400 });
    }
    if (!userId || userId !== ADMIN_USER_ID) {
      return NextResponse.json({ message: 'Unauthorized. Only admins can set hot status.' }, { status: 403 });
    }

    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    db.posts[postIndex].isManuallyHot = isHot;
    await writeDb(db);

    console.log(`[API PUT /posts/${postId}/set-hot] Post manual hot status updated to ${isHot}.`);
    return NextResponse.json(db.posts[postIndex], { status: 200 });

  } catch (error: any) {
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid request body. Expected JSON.' }, { status: 400 });
    }
    console.error(`[API PUT /posts/${postId}/set-hot] Error:`, error);
    return NextResponse.json({ message: 'Failed to update manual hot status.', error: error.message }, { status: 500 });
  }
}
