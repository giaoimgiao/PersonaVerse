
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
const crypto = require('crypto'); // For generating unique IDs and filenames

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const DB_DIR = path.join(__dirname, 'src', 'data');
const DB_FILE_PATH = path.join(DB_DIR, 'community_db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const AVATARS_SUBDIR = 'avatars'; // For associated persona avatars
const USER_AVATARS_SUBDIR = 'user_avatars'; // For post author avatars

// In-memory store for rate limiting (resets on server restart)
const postRateLimit = {};
const MAX_POSTS_PER_DAY = 3;

// Ensure required directories exist on startup
const ensureDirectoriesExist = async () => {
  try {
    await fs.mkdir(path.join(UPLOADS_DIR, AVATARS_SUBDIR), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, USER_AVATARS_SUBDIR), { recursive: true });
    await fs.mkdir(DB_DIR, { recursive: true });
    console.log('Uploads and data directories ensured.');
  } catch (error) {
    console.error('Error creating required directories:', error);
    // We can let the server continue, as readDb/writeDb will handle db file creation
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for base64 images
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' (e.g., uploaded images)

// Database helper functions
async function readDb() {
  try {
    await fs.access(DB_FILE_PATH); // Check if file exists
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with a default structure
    if (error.code === 'ENOENT') {
      console.log(`Database file ${DB_FILE_PATH} not found, creating with default structure.`);
      const defaultDb = { posts: [] };
      await writeDb(defaultDb);
      return defaultDb;
    }
    console.error('Error reading database file:', error);
    throw error; // Re-throw other errors
  }
}

async function writeDb(data) {
  try {
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
    throw error;
  }
}

// Image saving helper
async function saveBase64Image(base64Data, subfolder) {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    // If it's not a base64 string (could be an existing URL), return it as is
    return base64Data;
  }
  try {
    // data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/......
    const matches = base64Data.match(/^data:(image\/(.+));base64,(.*)$/);
    if (!matches || matches.length !== 4) {
      console.warn('Invalid base64 image format received for saving.');
      return null; // Or return original data if you want to store invalid base64 as is
    }

    const imageType = matches[2]; // e.g., 'png', 'jpeg'
    const base64Image = matches[3];
    const buffer = Buffer.from(base64Image, 'base64');

    const filename = `${crypto.randomBytes(16).toString('hex')}.${imageType}`;
    const saveDir = path.join(UPLOADS_DIR, subfolder);
    const filePath = path.join(saveDir, filename);

    await fs.writeFile(filePath, buffer);
    console.log(`Image saved to ${filePath}`);
    return `/uploads/${subfolder}/${filename}`; // Return the web-accessible path
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null; // Or original data
  }
}


// API Routes (directly on app, not under /api/community anymore)
app.get('/posts', async (req, res) => {
  try {
    const db = await readDb();
    // Ensure posts have comments array and like counts initialized
    const postsWithDefaults = db.posts.map(post => ({
      ...post,
      comments: post.comments || [],
      commentCount: post.comments?.length || 0,
      likes: post.likes || 0,
    }));
    const sortedPosts = postsWithDefaults.sort((a, b) => b.timestamp - a.timestamp);
    res.json(sortedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

app.post('/posts', async (req, res) => {
  try {
    const newPostData = req.body;

    // Basic validation
    if (!newPostData.title || !newPostData.content || !newPostData.userId || !newPostData.userName) {
      return res.status(400).json({ message: 'Missing required fields for post (title, content, userId, userName)' });
    }

    // Rate limiting
    const userId = newPostData.userId;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!postRateLimit[userId]) {
      postRateLimit[userId] = {};
    }
    if (!postRateLimit[userId][today]) {
      postRateLimit[userId][today] = 0;
    }

    if (postRateLimit[userId][today] >= MAX_POSTS_PER_DAY) {
      return res.status(429).json({ message: '发帖频率超限，您今天已达到最大发帖次数。' });
    }

    // Process associated persona avatar
    let finalAssociatedPersonaAvatarUrl = newPostData.associatedPersonaAvatarUrl;
    if (newPostData.associatedPersonaData && newPostData.associatedPersonaData.avatarImage) {
      finalAssociatedPersonaAvatarUrl = await saveBase64Image(newPostData.associatedPersonaData.avatarImage, AVATARS_SUBDIR);
      // Remove base64 from data to be stored in DB
      if (newPostData.associatedPersonaData) {
           delete newPostData.associatedPersonaData.avatarImage;
      }
    }


    // Process user avatar
    let finalUserAvatarUrl = newPostData.userAvatarUrl;
    if (newPostData.userAvatarUrl && newPostData.userAvatarUrl.startsWith('data:image')) {
        finalUserAvatarUrl = await saveBase64Image(newPostData.userAvatarUrl, USER_AVATARS_SUBDIR);
    }


    const postToInsert = {
      ...newPostData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      likes: newPostData.likes || 0,
      comments: newPostData.comments || [],
      commentCount: newPostData.comments?.length || 0,
      associatedPersonaAvatarUrl: finalAssociatedPersonaAvatarUrl,
      userAvatarUrl: finalUserAvatarUrl,
    };
    
    // Ensure no base64 data for persona avatar is in the final post object to be stored
    if (postToInsert.associatedPersonaData && postToInsert.associatedPersonaData.avatarImage) {
        // This check might be redundant if already deleted above, but good for safety
        if (String(postToInsert.associatedPersonaData.avatarImage).startsWith('data:image')) {
            delete postToInsert.associatedPersonaData.avatarImage;
        }
    }


    const db = await readDb();
    db.posts.push(postToInsert);
    await writeDb(db);

    postRateLimit[userId][today]++; // Increment post count for the day

    res.status(201).json(postToInsert);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

app.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  try {
    const db = await readDb();
    const initialLength = db.posts.length;
    db.posts = db.posts.filter(post => post.id !== postId);

    if (db.posts.length === initialLength) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await writeDb(db);
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(`Error deleting post ${postId}:`, error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

app.put('/posts/:postId/like', async (req, res) => {
  const { postId } = req.params;
  try {
    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }

    db.posts[postIndex].likes = (db.posts[postIndex].likes || 0) + 1;
    await writeDb(db);
    res.status(200).json(db.posts[postIndex]);
  } catch (error) {
    console.error(`Error liking post ${postId}:`, error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

app.post('/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { userId, userName, userAvatarUrl, text } = req.body;

  if (!userId || !userName || !text) {
    return res.status(400).json({ message: 'Missing required fields for comment (userId, userName, text)' });
  }

  try {
    const db = await readDb();
    const postIndex = db.posts.findIndex(post => post.id === postId);

    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      id: crypto.randomUUID(),
      userId,
      userName,
      userAvatarUrl: userAvatarUrl, // Will be URL or path after frontend processing
      text,
      timestamp: Date.now(),
    };

    if (!db.posts[postIndex].comments) {
      db.posts[postIndex].comments = [];
    }
    db.posts[postIndex].comments.push(newComment);
    db.posts[postIndex].commentCount = db.posts[postIndex].comments.length;

    await writeDb(db);
    res.status(201).json(db.posts[postIndex]); // Return the updated post
  } catch (error) {
    console.error(`Error adding comment to post ${postId}:`, error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Graceful shutdown
const cleanup = async () => {
  console.log('Shutting down server...');
  // Perform any cleanup tasks here if needed
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);


// Start server function
async function startServer() {
  console.log('Attempting to ensure directories exist...');
  await ensureDirectoriesExist(); // Ensure upload/data dirs are present

  console.log('Attempting to initialize database...');
  try {
    await readDb(); // This will create db if not exists
    console.log('Database initialized successfully or already exists.');
  } catch (dbInitError) {
    console.error("CRITICAL: Failed to initialize database. Server cannot start.", dbInitError);
    process.exit(1); // Exit if DB can't be set up
  }
  
  console.log('Starting server...');
  try {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Node.js server for community API (File DB) listening on http://0.0.0.0:${PORT}`);
      console.log(`  e.g., http://0.0.0.0:${PORT}/posts`);
      console.log(`Using database file: ${DB_FILE_PATH}`);
      console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
      console.log(`Avatar uploads go to: ${UPLOADS_DIR}`);
      console.warn(`IMPORTANT: If accessing from a browser on a different machine or in a container/VM (like Firebase Studio/Cloud Workstation), replace '0.0.0.0' or 'localhost' in your browser/frontend config with the machine's/VM's actual public IP address or publicly accessible hostname for port ${PORT}.`);
      console.warn(`For Firebase Studio/Cloud Workstation, use the Studio-provided URL for port ${PORT}.`);
    });
  } catch (listenError) {
    console.error("CRITICAL: Failed to start server on port " + PORT, listenError);
    process.exit(1);
  }
}

// Unhandled error catcher
app.use((err, req, res, next) => {
  console.error("Unhandled error in Express route:", err.stack);
  if (!res.headersSent) {
    res.status(500).send('Something broke on the server!');
  }
});

startServer().catch(err => {
  console.error("Failed to execute startServer function:", err);
  process.exit(1);
});
