
# 角色宇宙 - AI 角色扮演与社区应用

## 简介

“角色宇宙”是一个基于 AI 的角色扮演和社区分享应用。用户可以创建、定制和优化 AI 角色，与这些角色进行多模态（文本+图片）对话，并将自己的角色卡分享到社区，与其他用户互动。

## 技术栈

*   **前端**: Next.js (App Router), React, TypeScript
*   **UI**: ShadCN UI 组件, Tailwind CSS
*   **AI 功能**: Genkit (Google AI - Gemini模型)
*   **后端逻辑 (社区功能)**: Next.js API Routes
*   **数据存储 (社区功能)**: 文件型数据库 (`src/data/community_db.json`)
*   **数据存储 (用户配置、角色卡等)**: 浏览器 `localStorage`
*   **图片存储 (社区功能)**: 服务器 `public/uploads/` 目录 (由 Next.js API Routes 处理)

## 主要功能

*   **AI 角色创建与管理**:
    *   通过自然语言描述快速生成角色卡。
    *   支持手动详细配置角色卡的各项属性。
    *   允许用户上传角色头像。
    *   优化和编辑已创建的角色卡。
*   **AI 角色对话**:
    *   与创建的 AI 角色进行多模态对话（支持发送文本和图片）。
    *   **聊天设置**: 可调整 AI 模型的温度、最大输出长度。
    *   **Gemini 安全设置**: 用户可自定义 Gemini 模型的5种内容安全过滤级别。
    *   **关键词记忆系统 (“世界书”)**:
        *   用户可为每个角色设定关键词及其关联的 Prompt/描述。
        *   可配置关键词的触发源（用户、AI、两者）和激活范围（当前回合、历史对话）。
        *   AI 在对话中会参考激活的关键词信息。
    *   **角色扮演设定**:
        *   用户可在聊天中设定自己的临时性别、与角色的关系、临时扮演名称。
        *   支持自定义“镜头语言”/视觉小说风格的 Prompt，AI 会根据此生成描述性场景。
    *   **好感度系统**: AI 会根据对话动态调整对用户的好感度，并尝试进行后台自检校准。
*   **社区广场**:
    *   用户可以发布帖子，并关联自己的角色卡进行分享。
    *   其他用户可以浏览社区帖子列表。
    *   **帖子详情**: 查看帖子完整内容、关联角色卡信息、评论。
    *   **点赞功能**: 用户可以对帖子进行点赞。
    *   **评论功能**: 用户可以对帖子发表评论。
    *   **图片分离存储**: 用户头像和角色卡头像会保存为文件，数据库中仅存储路径。
    *   **发帖频率限制**: 用户每天发帖数量受限（后端 API Routes 处理）。
    *   **推荐与热门**: 管理员可以设置推荐帖子，帖子也会根据互动热度标记为“热门”。
    *   **帖子搜索与排序**: 用户可以按关键词搜索帖子，并按最新、点赞最多、评论最多排序。
*   **用户个人资料**:
    *   设置用户昵称。
    *   上传用户头像。
*   **API 设置**:
    *   配置不同 AI 提供商（Gemini, OpenAI, Claude, 自定义端点）的 API 密钥和模型名称。
    *   提供连接测试功能，验证模型配置的有效性。
*   **管理员后台**:
    *   仅限管理员访问。
    *   管理社区帖子（查看、删除、推荐/取消推荐、设为热门/取消热门）。

## 如何运行

1.  **克隆项目**:
    ```bash
    git clone <项目仓库地址>
    cd <项目目录>
    ```
2.  **安装依赖**:
    ```bash
    npm install
    # 或者
    # yarn install
    ```
3.  **配置环境变量**:
    *   在项目根目录创建一个 `.env` 文件 (如果不存在)。
    *   添加必要的 API 密钥，特别是 Genkit (Google AI) 所需的 `GOOGLE_API_KEY`。
        ```env
        # 示例 .env 文件内容
        GOOGLE_API_KEY=您的GoogleAIStudio的API密钥
        ```
    *   (可选) 如果您在 Cloud Workstation 或类似需要公共 URL 访问后端 API 的环境中，请设置 `NEXT_PUBLIC_COMMUNITY_API_URL` 指向您的 API 根路径。对于纯本地开发，此变量可以不设置，默认为 `/api`。

4.  **运行开发服务器**:
    *   **Next.js 前端与 API Routes**:
        ```bash
        npm run dev
        ```
        (此命令会启动 Next.js 应用，通常在 `http://localhost:9002`)
    *   **Genkit AI 服务**:
        ```bash
        npm run genkit:dev
        # 或者，带文件监听自动重启
        # npm run genkit:watch
        ```
        (此命令会启动 Genkit 服务，用于处理 AI 相关功能，调试器通常在 `http://localhost:3500`)

5.  **访问应用**:
    *   在浏览器中打开 Next.js 应用的地址 (例如 `http://localhost:9002`)。

## 注意事项

*   **社区数据存储**: 社区帖子的数据（包括图片路径、评论、点赞数）目前通过 Next.js API Routes 存储在项目 `src/data/community_db.json` 文件中。用户上传的图片存储在 `public/uploads/` 目录下。这种方式主要适用于开发和原型阶段。
*   **生产环境部署**: 如果将此应用部署到 Serverless 平台（如 Vercel, Netlify, Firebase Hosting + Cloud Functions），直接写入项目文件系统可能会受限或数据非持久化。生产环境建议迁移到云数据库（如 Firebase Firestore, MongoDB Atlas）和云存储服务（如 Firebase Storage, AWS S3）。
*   **API 密钥安全**: 请妥善保管您的 API 密钥，不要将其硬编码到前端代码或提交到公共代码仓库。使用 `.env` 文件管理密钥是推荐的做法。
*   **发帖频率限制**: 目前的发帖频率限制是基于用户ID在API路由的内存中实现的，如果API路由进程重启，限制会重置。

## 项目结构 (简要)

-   `src/app/`: Next.js App Router 页面组件和 API Routes (`src/app/api/`)。
-   `src/ai/`: Genkit Flows (AI 逻辑)。
-   `src/components/`: 可复用的 UI 组件 (大部分为 ShadCN UI)。
-   `src/hooks/`: 自定义 React Hooks。
-   `src/lib/`: 工具函数、常量定义。
-   `src/types/`: TypeScript 类型定义。
-   `src/data/community_db.json`: 社区帖子的文件型数据库。
-   `public/uploads/`: 用户上传图片存储目录。

---
祝您使用愉快！
