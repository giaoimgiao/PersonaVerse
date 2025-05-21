
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CommunityPost, PersonaData } from '@/types';

const DB_DIR = path.join(process.cwd(), 'src', 'data');
const DB_FILE_PATH = path.join(DB_DIR, 'community_db.json');

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const AVATARS_SUBDIR = 'avatars';
const USER_AVATARS_SUBDIR = 'user_avatars';

const postRateLimit: Record<string, Record<string, number>> = {};
const MAX_POSTS_PER_DAY = 3;

async function ensureDirExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code === 'EEXIST') return;
    console.error(`[API POSTS] Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

async function readDb(): Promise<{ posts: CommunityPost[] }> {
  try {
    await fs.access(DB_FILE_PATH);
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    if (data.trim() === '') return { posts: [] };
    const parsedData = JSON.parse(data);
    // Ensure all posts have default values for new fields
    const postsWithDefaults = (parsedData.posts || []).map((post: any) => ({
      ...post,
      comments: post.comments || [],
      commentCount: post.comments?.length || 0,
      likes: post.likes || 0,
      isRecommended: post.isRecommended || false,
      isManuallyHot: post.isManuallyHot || false, // Default for isManuallyHot
    }));
    return { posts: postsWithDefaults };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDirExists(DB_DIR);
      await fs.writeFile(DB_FILE_PATH, JSON.stringify({ posts: [] }, null, 2), 'utf-8');
      return { posts: [] };
    }
    console.error('[API POSTS] Error reading database file:', error);
    return { posts: [] }; // Return empty on other errors to prevent crashes
  }
}

async function writeDb(data: { posts: CommunityPost[] }) {
  try {
    await ensureDirExists(DB_DIR);
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API POSTS] Error writing to database file:', error);
    throw error;
  }
}

async function saveBase64Image(base64Data: string, subfolder: string): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return base64Data; // Assume it's already a path or null
  }
  try {
    const matches = base64Data.match(/^data:(image\/(.+));base64,(.*)$/);
    if (!matches || matches.length !== 4) {
      console.warn('[API saveBase64Image] Invalid base64 image format.');
      return null;
    }

    const imageType = matches[2];
    const base64Image = matches[3];
    const buffer = Buffer.from(base64Image, 'base64');

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${imageType}`;
    const targetDir = path.join(UPLOADS_DIR, subfolder);
    await ensureDirExists(targetDir);

    const filePath = path.join(targetDir, filename);
    const webPath = `/uploads/${subfolder}/${filename}`; // Relative path for web access

    await fs.writeFile(filePath, buffer);
    console.log(`[API saveBase64Image] Image saved to ${filePath}, web path: ${webPath}`);
    return webPath;
  } catch (error) {
    console.error('[API saveBase64Image] Error saving base64 image:', error);
    return null;
  }
}

// GET /api/posts - Fetch all posts
export async function GET() {
  console.log("[API /api/posts] GET request received.");
  try {
    const db = await readDb();
    const sortedPosts = (db.posts || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    console.log(`[API /api/posts GET] Responding with ${sortedPosts.length} posts.`);
    return NextResponse.json(sortedPosts);
  } catch (e: any) {
    console.error("[API /api/posts GET] Critical error in GET handler:", e);
    return NextResponse.json({ message: "服务器在获取帖子时发生内部错误。", error: e.message }, { status: 500 });
  }
}

// POST /api/posts - Create a new post
export async function POST(request: Request) {
  console.log("[API /api/posts] POST request received.");
  try {
    const newPostData = await request.json();
    console.log("[API /api/posts POST] Received new post data for title:", newPostData.title);

    const userId = newPostData.userId;
    if (!userId) {
      console.warn("[API /api/posts POST] UserID is missing from post data.");
      return NextResponse.json({ message: 'UserID is required for posting.' }, { status: 400 });
    }
    // Rate limiting
    const today = new Date().toISOString().slice(0, 10);
    if (!postRateLimit[userId]) postRateLimit[userId] = {};
    if (!postRateLimit[userId][today]) postRateLimit[userId][today] = 0;

    if (postRateLimit[userId][today] >= MAX_POSTS_PER_DAY) {
      console.warn(`[API /api/posts POST] Rate limit exceeded for user ${userId}.`);
      return NextResponse.json({ message: '发帖频率超限，您今天已达到最大发帖次数。' }, { status: 429 });
    }

    let finalUserAvatarUrl = newPostData.userAvatarUrl;
    if (newPostData.userAvatarUrl && newPostData.userAvatarUrl.startsWith('data:image')) {
      finalUserAvatarUrl = await saveBase64Image(newPostData.userAvatarUrl, USER_AVATARS_SUBDIR) || newPostData.userAvatarUrl;
    }

    let finalAssociatedPersonaAvatarUrl = newPostData.associatedPersonaAvatarUrl;
    let processedPersonaData = newPostData.associatedPersonaData as PersonaData | undefined;

    if (processedPersonaData && processedPersonaData.avatarImage && processedPersonaData.avatarImage.startsWith('data:image')) {
      finalAssociatedPersonaAvatarUrl = await saveBase64Image(processedPersonaData.avatarImage, AVATARS_SUBDIR);
      processedPersonaData = { ...processedPersonaData }; 
      delete processedPersonaData.avatarImage; // Remove base64 from data to be stored in DB
    } else if (processedPersonaData && processedPersonaData.avatarImage) {
      // If avatarImage is a path, keep it for associatedPersonaAvatarUrl (though it might be redundant)
      finalAssociatedPersonaAvatarUrl = processedPersonaData.avatarImage;
      // Ensure base64 is not in processedPersonaData
      processedPersonaData = { ...processedPersonaData }; 
      delete processedPersonaData.avatarImage;
    }


    const postToInsert: CommunityPost = {
      ...newPostData,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      likes: 0,
      comments: [],
      commentCount: 0,
      isRecommended: false,
      isManuallyHot: false, // Default for new posts
      userAvatarUrl: finalUserAvatarUrl,
      associatedPersonaAvatarUrl: finalAssociatedPersonaAvatarUrl,
      associatedPersonaData: processedPersonaData,
    };
    
    if (postToInsert.associatedPersonaData && typeof postToInsert.associatedPersonaData.avatarImage !== 'undefined') {
        delete postToInsert.associatedPersonaData.avatarImage;
    }

    const db = await readDb();
    db.posts.push(postToInsert);
    await writeDb(db);

    postRateLimit[userId][today]++;
    console.log(`[API /api/posts POST] Post created successfully by ${userId}. Today's count: ${postRateLimit[userId][today]}. Post ID: ${postToInsert.id}`);
    return NextResponse.json(postToInsert, { status: 201 });
  } catch (error: any) {
    console.error('[API /api/posts POST] Error creating post:', error);
    return NextResponse.json({ message: '创建帖子失败，服务器内部错误。', error: error.message }, { status: 500 });
  }
}
