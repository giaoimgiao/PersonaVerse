
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost } from '@/types';
import { ADMIN_USER_ID } from '@/lib/constants';

const DB_DIR = path.join(process.cwd(), 'src', 'data');
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
      console.warn(`[API DB Recommend] Database file ${DB_FILE_PATH} not found, creating with default structure.`);
      await fs.mkdir(DB_DIR, { recursive: true }).catch(console.error); // Ensure DB_DIR exists
      const defaultDb = { posts: [] };
      await fs.writeFile(DB_FILE_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8').catch(console.error);
      return defaultDb;
    }
    console.error('[API DB Recommend] Error reading database file:', error);
    throw new Error('Failed to read database for recommend');
  }
}

async function writeDb(data: { posts: CommunityPost[] }) {
  try {
    await fs.mkdir(DB_DIR, { recursive: true }); // Ensure DB_DIR exists
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API DB Recommend] Error writing to database file:', error);
    throw new Error('Failed to write to database for recommend');
  }
}

// PUT /api/posts/[postId]/recommend
export async function PUT(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  console.log(`[API PUT /posts/${postId}/recommend] Received request to toggle recommendation.`);

  if (!postId) {
    console.warn('[API PUT /posts/:id/recommend] Post ID is missing from request params.');
    return NextResponse.json({ message: 'Post ID is required in path' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { recommend, userId } = body;
    console.log(`[API PUT /posts/${postId}/recommend] Request body: userId=${userId}, recommend=${recommend}`);


    if (typeof recommend !== 'boolean') {
      console.warn(`[API PUT /posts/${postId}/recommend] Invalid "recommend" value: ${recommend}. Must be boolean.`);
      return NextResponse.json({ message: 'Invalid "recommend" value in request body. Must be boolean.' }, { status: 400 });
    }
    if (!userId) {
        console.warn(`[API PUT /posts/${postId}/recommend] User ID is missing from request body.`);
        return NextResponse.json({ message: 'User ID is required for this action.' }, { status: 400 });
    }
    if (userId !== ADMIN_USER_ID) {
        console.warn(`[API PUT /posts/${postId}/recommend] Unauthorized attempt by user ${userId}. Only admin (${ADMIN_USER_ID}) can recommend.`);
        return NextResponse.json({ message: 'Unauthorized. Only admins can recommend posts.' }, { status: 403 });
    }

    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      const availablePostIds = db.posts.map(p => p.id);
      console.warn(`[API PUT /posts/${postId}/recommend] Post with ID "${postId}" not found in DB. Available post IDs: [${availablePostIds.join(', ')}]`);
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    db.posts[postIndex].isRecommended = recommend;
    await writeDb(db);

    console.log(`[API PUT /posts/${postId}/recommend] Post recommendation status successfully updated to ${recommend}.`);
    return NextResponse.json(db.posts[postIndex], { status: 200 });

  } catch (error: any) {
    console.error(`[API PUT /posts/${postId}/recommend] Error updating recommendation status:`, error.message, error.stack);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid request body. Expected JSON.', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update recommendation status due to a server error.', error: error.message }, { status: 500 });
  }
}
