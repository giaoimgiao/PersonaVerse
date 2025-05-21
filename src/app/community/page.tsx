
"use client";

import React, { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import { PlusCircle, ThumbsUp, MessageCircle as CommentIcon, Edit3, Trash2, DownloadCloud, Image as ImageIconPlaceholder, User as UserIcon, Search, ArrowUpDown, Star, Flame } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadcnDialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ShadcnAlertDialogDescriptionRenamed,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { CommunityPost, Persona, PersonaData, UserProfile, Comment } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { ADMIN_USER_ID } from '@/lib/constants';

const API_BASE_URL = "/api"; // For Next.js API Routes

type SortOrder = "newest" | "mostLiked" | "mostCommented";
type ActiveTab = "all" | "recommended";

const getFullImageUrl = (relativePath?: string): string => {
  if (!relativePath) return `https://placehold.co/80x80.png?text=N/A&txtsize=10`;
  if (/^(http|https|data):/i.test(relativePath)) {
    return relativePath;
  }
  // For Next.js API Routes, images in /public are served from the root
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
};

interface PostDetailModalProps {
  post: CommunityPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onImportPersona: (personaData: PersonaData, personaName: string) => void;
  onLikePost: (postId: string) => Promise<void>;
  onCommentSubmit: (postId: string, commentText: string) => Promise<void>;
  hasUserLikedPost: (postId: string) => boolean;
  onToggleRecommend: (postId: string, currentIsRecommended: boolean) => Promise<void>;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, isOpen, onClose, currentUserProfile, onImportPersona, onLikePost, onCommentSubmit, hasUserLikedPost, onToggleRecommend }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCommentText('');
    }
  }, [isOpen]);

  if (!post) return null;

  const timeAgo = post.timestamp ? formatDistanceToNow(new Date(post.timestamp), { addSuffix: true, locale: zhCN }) : "未知时间";
  const isAdminPost = post.userId === ADMIN_USER_ID;
  const userAvatarFullUrl = getFullImageUrl(post.userAvatarUrl);
  
  const personaAvatarFullUrl = post.associatedPersonaData 
    ? getFullImageUrl(post.associatedPersonaData.avatarImage || post.associatedPersonaAvatarUrl) 
    : getFullImageUrl(post.associatedPersonaAvatarUrl);

  const handleInternalCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserProfile || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
        await onCommentSubmit(post.id, commentText);
        setCommentText('');
    } catch (error: any) {
        toast({ title: '评论失败', description: error.message || "提交评论时发生错误。", variant: 'destructive' });
    } finally {
        setIsSubmittingComment(false);
    }
  };

  const alreadyLiked = hasUserLikedPost(post.id);
  const isCurrentUserAdmin = currentUserProfile?.id === ADMIN_USER_ID;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[calc(100vh-8rem)]">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl break-words">{post.title}</DialogTitle>
           <ShadcnDialogDescription asChild>
            <div className="text-sm text-muted-foreground flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={userAvatarFullUrl} alt={post.userName} data-ai-hint="user avatar"/>
                <AvatarFallback>{post.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span>{post.userName}</span>
              {isAdminPost && <Badge variant="secondary" className="ml-1">管理员</Badge>}
              <span className="text-xs text-muted-foreground">· {timeAgo}</span>
            </div>
          </ShadcnDialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4"> {/* This div handles scrolling */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}>
          </div>

          {post.associatedPersonaData && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">关联角色卡</h3>
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={personaAvatarFullUrl} alt={post.associatedPersonaData.人设名称 || post.associatedPersonaName} data-ai-hint="character avatar"/>
                      <AvatarFallback>{post.associatedPersonaData.人设名称?.[0]?.toUpperCase() || post.associatedPersonaName?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{post.associatedPersonaData.人设名称 || post.associatedPersonaName}</CardTitle>
                      <CardDescription>{post.associatedPersonaData.身份 || '未知身份'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {post.associatedPersonaData.性格锚点A?.性格特点?.join('， ') || '暂无性格描述'}
                  </p>
                </CardContent>
                <CardFooter>
                  {currentUserProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onImportPersona(post.associatedPersonaData!, post.associatedPersonaData!.人设名称 || post.associatedPersonaName || "导入的角色")}
                      disabled={!post.associatedPersonaData}
                    >
                      <DownloadCloud className="mr-2 h-4 w-4" /> 导入此角色卡
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">评论 ({post.commentCount || 0})</h3>
            {currentUserProfile && (
              <form onSubmit={handleInternalCommentSubmit} className="flex gap-2 mb-4">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="发表你的评论..."
                  className="flex-grow"
                  rows={2}
                  disabled={isSubmittingComment}
                />
                <Button type="submit" disabled={!commentText.trim() || isSubmittingComment}>
                  {isSubmittingComment ? "发表中..." : "发表评论"}
                </Button>
              </form>
            )}
            <div className="space-y-4">
              {(post.comments || []).slice().reverse().map(comment => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getFullImageUrl(comment.userAvatarUrl)} alt={comment.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback>{comment.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: zhCN }) : "未知时间"}
                      </p>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))}
              {(!post.comments || post.comments.length === 0) && <p className="text-sm text-muted-foreground">暂无评论。</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t px-6 pb-6 pt-4 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
         <div className="flex items-center space-x-2">
            <Button
              variant={alreadyLiked ? "default" : "outline"}
              size="sm"
              onClick={() => onLikePost(post.id)}
              disabled={!currentUserProfile}
            >
              <ThumbsUp className={cn("mr-1.5 h-4 w-4", alreadyLiked && "fill-current")} /> {post.likes || 0}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <CommentIcon className="mr-1.5 h-4 w-4" /> {post.commentCount || 0}
            </Button>
             {isCurrentUserAdmin && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleRecommend(post.id, post.isRecommended || false)}
                >
                    <Star className={cn("mr-1.5 h-4 w-4", post.isRecommended && "fill-yellow-400 text-yellow-500")} />
                    {post.isRecommended ? "取消推荐" : "设为推荐"}
                </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button type="button" variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PostCard: React.FC<{
  post: CommunityPost;
  currentUserProfile: UserProfile | null;
  onDeletePost: (postId: string) => Promise<void>;
  onEditPost: (post: CommunityPost) => void;
  onViewPost: (post: CommunityPost) => void;
  onLikePost: (postId: string) => Promise<void>;
  hasUserLikedPost: (postId: string) => boolean;
}> = ({ post, currentUserProfile, onDeletePost, onEditPost, onViewPost, onLikePost, hasUserLikedPost }) => {
  const timeAgo = post.timestamp ? formatDistanceToNow(new Date(post.timestamp), { addSuffix: true, locale: zhCN }) : "未知时间";
  const isOwnPost = currentUserProfile && post.userId === currentUserProfile.id;
  const isAdminPost = post.userId === ADMIN_USER_ID;
  const userAvatarFullUrl = getFullImageUrl(post.userAvatarUrl);
  const personaAvatarFullUrl = getFullImageUrl(post.associatedPersonaAvatarUrl);
  const alreadyLiked = hasUserLikedPost(post.id);
  const isHot = post.isManuallyHot || ((post.likes || 0) >= 10 || (post.commentCount || 0) >= 5);


  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="p-4">
        <div className="flex items-start space-x-3 mb-2">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={userAvatarFullUrl} alt={post.userName} data-ai-hint="user avatar"/>
            <AvatarFallback>{post.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="flex items-center space-x-1.5">
              <p className="text-sm font-semibold text-foreground">{post.userName}</p>
              {isAdminPost && <Badge variant="secondary" className="ml-1">管理员</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          {isOwnPost && (
            <div className="flex flex-col space-y-1 items-end flex-shrink-0">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除帖子?</AlertDialogTitle>
                    <ShadcnAlertDialogDescriptionRenamed>帖子 "{post.title}" 将被永久删除，相关图片也会被删除。</ShadcnAlertDialogDescriptionRenamed>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onDeletePost(post.id)}
                        className={buttonVariants({variant: "destructive"})}>
                        确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEditPost(post)}>
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 mb-1">
            {post.isRecommended && <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-primary-foreground"><Star className="mr-1 h-3 w-3"/>推荐</Badge>}
            {isHot && <Badge variant="destructive"><Flame className="mr-1 h-3 w-3" />热门</Badge>}
        </div>
        <CardTitle className="text-xl leading-tight line-clamp-2 cursor-pointer hover:text-primary" onClick={() => onViewPost(post)}>{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow cursor-pointer" onClick={() => onViewPost(post)}>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.content}</p>
        {post.associatedPersonaId && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-primary mb-1.5">关联角色：</p>
            <div className="flex items-center space-x-2 p-2 rounded-md bg-accent/10 hover:bg-accent/20 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={personaAvatarFullUrl} alt={post.associatedPersonaName} data-ai-hint="character avatar"/>
                <AvatarFallback>{post.associatedPersonaName?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-accent-foreground">{post.associatedPersonaName}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t bg-card/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={alreadyLiked ? "default" : "outline"}
            size="sm"
            className={cn(alreadyLiked ? "" : "text-muted-foreground hover:text-primary")}
            onClick={() => onLikePost(post.id)}
            disabled={!currentUserProfile}
          >
            <ThumbsUp className={cn("mr-1.5 h-4 w-4", alreadyLiked && "fill-current")} /> {post.likes || 0}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => onViewPost(post)}>
            <CommentIcon className="mr-1.5 h-4 w-4" /> {post.commentCount || 0}
          </Button>
        </div>
         <Button variant="outline" size="sm" onClick={() => onViewPost(post)}>
          查看详情
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useLocalStorage<UserProfile>('userProfile', {
    id: `user_${typeof window !== 'undefined' ? Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5) : Math.random().toString(36).substring(2,8)}`,
    name: '访客',
    avatarUrl: undefined,
  });
  const [userPersonas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [userLikedPosts, setUserLikedPosts] = useLocalStorage<Record<string, string[]>>('userLikedPosts', {});

  const { toast } = useToast();

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [viewingPost, setViewingPost] = useState<CommunityPost | null>(null);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  const fetchPosts = useCallback(async () => {
    console.log(`[CommunityPage] Fetching posts from: ${API_BASE_URL}/posts`);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) {
        let backendMessage = `获取帖子失败 (状态: ${response.status})`;
        try {
          const errorData = await response.json().catch(() => ({ message: '无法解析服务器错误响应' }));
          backendMessage = errorData.message || backendMessage;
           if (errorData.details) backendMessage += ` 详情: ${errorData.details}`;
           console.error(`[CommunityPage] Backend error on fetchPosts (status ${response.status}):`, errorData);
        } catch (e) {
          const responseText = await response.text().catch(() => "无法读取响应文本");
          backendMessage += ` - 服务器响应: ${responseText.substring(0, 200)}...`;
          console.error("[CommunityPage] Raw error response text on fetchPosts:", responseText);
        }
        console.error("[CommunityPage] Error fetching posts, status:", response.status, "message:", backendMessage);
        throw new Error(backendMessage);
      }
      const data: CommunityPost[] = await response.json();
      console.log("[CommunityPage] Successfully fetched posts:", data.length, "posts.");
      setPosts(data);
    } catch (error: any) {
      console.error("[CommunityPage] Full error in fetchPosts:", error);
      let userFriendlyMessage = error.message || '无法加载社区帖子。';
      if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
        userFriendlyMessage = '无法连接到社区API服务。请确认API服务 (Next.js API Routes) 正在运行，并且浏览器可以访问它。';
        if (typeof window !== 'undefined' && window.location.hostname.includes('cloudworkstations.dev') ) {
             userFriendlyMessage = '在Cloud Workstation环境中，请检查您的网络配置和API路由是否部署正确。也请确认 .env 文件中的 NEXT_PUBLIC_COMMUNITY_API_URL 指向了正确的API根路径 (例如 /api)。';
        } else if (typeof window !== 'undefined' && API_BASE_URL === '/api' ){
             userFriendlyMessage = `无法连接到社区API服务。请确认API服务 (${API_BASE_URL}) 正在运行。`;
        }
      }
      toast({ title: '加载帖子错误', description: userFriendlyMessage, variant: 'destructive' });
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (editingPost) {
      setPostTitle(editingPost.title);
      setPostContent(editingPost.content);
      setSelectedPersonaId(editingPost.associatedPersonaId || undefined);
      setIsCreatePostDialogOpen(true);
    } else {
      if (!isCreatePostDialogOpen) {
        setPostTitle('');
        setPostContent('');
        setSelectedPersonaId(undefined);
      }
    }
  }, [editingPost, isCreatePostDialogOpen]);


  const handleCreateOrUpdatePost = async () => {
    if (!currentUserProfile || currentUserProfile.id === 'guestUser' || currentUserProfile.name === '访客') {
      toast({ title: '错误', description: '需要设置有效昵称才能发帖。请先在“我的”页面设置您的资料。', variant: 'destructive' });
      return;
    }
    if (!postTitle.trim() || !postContent.trim()) {
      toast({ title: '错误', description: '帖子标题和内容不能为空。', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const selectedPersonaFull = userPersonas.find(p => p.id === selectedPersonaId);
    const personaDataForPost: PersonaData | undefined = selectedPersonaFull
        ? (({ id, ...rest }) => {
             const cleanedRest = JSON.parse(JSON.stringify(rest));
             if (selectedPersonaFull.avatarImage && typeof selectedPersonaFull.avatarImage === 'string') {
                cleanedRest.avatarImage = selectedPersonaFull.avatarImage;
             } else {
                delete cleanedRest.avatarImage;
             }
             return cleanedRest;
          })(selectedPersonaFull) as PersonaData
        : undefined;

    const basePayload = {
      userId: currentUserProfile.id,
      userName: currentUserProfile.name,
      userAvatarUrl: currentUserProfile.avatarUrl, // This could be Base64 or a path
      title: postTitle,
      content: postContent,
      associatedPersonaId: selectedPersonaFull?.id,
      associatedPersonaName: selectedPersonaFull?.['人设名称'],
      associatedPersonaAvatarUrl: selectedPersonaFull?.avatarImage, // This might be Base64 or a path
      associatedPersonaData: personaDataForPost, // This will send the full persona data, backend will decide what to save
    };

    let url = `${API_BASE_URL}/posts`;
    let method = 'POST';
    let postPayload: any = { ...basePayload, likes: 0, comments: [], commentCount: 0, isRecommended: false, isManuallyHot: false }; // Defaults for new post

    if (editingPost) {
      // This section is problematic for file-based DBs if not handled carefully by backend.
      // For now, we'll assume a PUT to /api/posts/[postId] is available for true updates.
      // If not, the backend POST might create a new entry or need specific logic.
      // The current Next.js API route for POST /api/posts always creates a new post.
      // A PUT /api/posts/[postId] route would be needed.
      // To simplify, and since we don't have PUT, this "edit" will be treated as "create new" by current backend.
      console.warn("Editing post will likely create a new post with current API setup.");
      toast({ title: '提示', description: '编辑帖子将作为新帖发布（当前后端限制）。', variant: 'default'});
      // If a true PUT was available:
      // method = 'PUT';
      // url = `${API_BASE_URL}/posts/${editingPost.id}`;
      // postPayload = { ...basePayload, likes: editingPost.likes, comments: editingPost.comments, commentCount: editingPost.commentCount, isRecommended: editingPost.isRecommended, isManuallyHot: editingPost.isManuallyHot };
    }


    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        let backendMessage = `${editingPost ? '更新' : '发布'}帖子失败 (状态: ${response.status})`;
        try {
          const errorData = await response.json().catch(() => ({ message: '无法解析服务器错误响应' }));
          backendMessage = errorData.message || backendMessage;
          if (response.status === 429) {
            backendMessage = errorData.message || "发帖频率超限，您今天已达到最大发帖次数。";
          }
        } catch (e) {
           const responseText = await response.text().catch(() => "无法读取响应文本");
           backendMessage += ` - 服务器: ${responseText.substring(0,100)}...`;
        }
        throw new Error(backendMessage);
      }

      toast({ title: '成功', description: `帖子已成功${editingPost ? '更新 (作为新帖)' : '发布'}！` });
      fetchPosts();
      closeDialogAndReset();
    } catch (error: any) {
      let userFriendlyMessage = error.message || `${editingPost ? '更新' : '发布'}帖子失败，请重试。`;
       if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
        userFriendlyMessage = '无法连接到社区API服务。';
      }
      toast({ title: `${editingPost ? '更新' : '发布'}失败`, description: userFriendlyMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
  };

  const handleDeletePost = async (postId: string) => {
    console.log(`[CommunityPage] Attempting to delete post: ${postId} via ${API_BASE_URL}/posts/${postId}`);
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let backendMessage = `删除失败 (状态: ${response.status})`;
        try {
            const errorData = await response.json().catch(() => ({message: '无法解析服务器错误响应'}));
             if (response.status === 404 && errorData.message && errorData.message.toLowerCase().includes('post not found')) {
                backendMessage = `无法删除：帖子 ID "${postId}" 未找到。可能已被删除。`;
            } else if (response.status === 403 && errorData.message ) {
                backendMessage = errorData.message; // For admin auth errors
            } else {
                backendMessage = errorData.message || backendMessage;
            }
            if (errorData.details) backendMessage += ` 详情: ${errorData.details}`;
            console.error(`[CommunityPage] Backend error on deletePost (status ${response.status}):`, errorData);
        } catch (e) {
           const responseText = await response.text().catch(() => "无法读取响应文本");
           backendMessage += ` - 服务器: ${responseText.substring(0,100)}...`;
           console.error(`[CommunityPage] Raw error response text on deletePost: ${responseText}`);
        }
        throw new Error(backendMessage);
      }
      toast({ title: '已删除', description: '帖子已成功删除。' });
      fetchPosts();
      if (viewingPost && viewingPost.id === postId) {
        setViewingPost(null);
      }
    } catch (error: any) {
      toast({ title: '删除失败', description: (error as Error).message, variant: 'destructive' });
      console.error("Error deleting post:", error);
    }
  };

  const handleViewPost = (post: CommunityPost) => {
    const freshPost = posts.find(p => p.id === post.id) || post;
    setViewingPost(freshPost);
  };

  const closeDialogAndReset = () => {
    setIsCreatePostDialogOpen(false);
    setEditingPost(null);
    if (!editingPost) {
        setPostTitle('');
        setPostContent('');
        setSelectedPersonaId(undefined);
    }
  };

  const handleImportPersona = (personaDataToImport: PersonaData, personaName: string) => {
    if (!currentUserProfile || currentUserProfile.id === 'guestUser' || currentUserProfile.name === '访客') {
        toast({ title: '导入失败', description: '请先在“我的”页面设置您的用户资料。', variant: 'destructive' });
        return;
    }
     const cleanPersonaData = JSON.parse(JSON.stringify(personaDataToImport));
     // Ensure avatarImage path from viewingPost (which should be correct relative path) is used
     const importedPersonaAvatar = cleanPersonaData.avatarImage || viewingPost?.associatedPersonaAvatarUrl || viewingPost?.associatedPersonaData?.avatarImage;


     const newPersona: Persona = {
        ...cleanPersonaData,
        avatarImage: importedPersonaAvatar,
        id: `imported_${Date.now().toString()}_${Math.random().toString(36).substring(2, 7)}`,
        人设名称: `${personaName} (导入)`,
     };
    setPersonas(prevPersonas => [...prevPersonas, newPersona]);

    toast({ title: '导入成功', description: `角色 "${newPersona.人设名称}" 已添加到您的角色列表。` });
    setViewingPost(null);
  };

  const hasUserLikedPost = useCallback((postId: string): boolean => {
    if (!currentUserProfile) return false;
    const likedByThisUser = userLikedPosts[currentUserProfile.id] || [];
    return likedByThisUser.includes(postId);
  }, [currentUserProfile, userLikedPosts]);

  const handleLikePost = async (postId: string) => {
    if (!currentUserProfile || currentUserProfile.id === 'guestUser' || currentUserProfile.name === '访客') {
        toast({title: "操作失败", description: "请先登录或设置昵称才能点赞。", variant: "destructive"});
        return;
    }

    if (hasUserLikedPost(postId)) {
      toast({title: "提示", description: "您已经点过赞了！", variant: "default"});
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, { method: 'PUT' });

      if (!response.ok) {
        let backendMessage = `点赞失败 (状态: ${response.status})`;
        try {
            const errorData = await response.json().catch(() => ({message: '无法解析服务器错误响应'}));
            if (response.status === 404 && errorData.message && errorData.message.toLowerCase().includes('post not found')) {
                backendMessage = `无法点赞：帖子 ID "${postId}" 未找到。`;
            } else {
                backendMessage = errorData.message || backendMessage;
            }
            if (errorData.details) backendMessage += ` 详情: ${errorData.details}`;
            console.error(`[CommunityPage] Backend error on likePost (status ${response.status}):`, errorData);
        } catch (e) {
           const responseText = await response.text().catch(() => "无法读取响应文本");
           backendMessage += ` - 服务器: ${responseText.substring(0,100)}...`;
           console.error(`[CommunityPage] Raw error response text on likePost: ${responseText}`);
        }
        throw new Error(backendMessage);
      }
      const updatedPostFromServer: CommunityPost = await response.json();

      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? updatedPostFromServer : p));
      if (viewingPost && viewingPost.id === postId) {
          setViewingPost(prev => prev ? {...prev, ...updatedPostFromServer} : null);
      }

      const userId = currentUserProfile.id;
      setUserLikedPosts(prevUserLikedPosts => {
        const likedByThisUser = prevUserLikedPosts[userId] || [];
        return {
          ...prevUserLikedPosts,
          [userId]: [...likedByThisUser, postId],
        };
      });
      toast({title: "点赞成功", description: "感谢您的点赞！"});
    } catch (error: any) {
        toast({title: "点赞失败", description: (error as Error).message, variant: "destructive"});
        console.error("Error liking post:", error);
    }
  };

 const handleCommentSubmit = async (postId: string, commentText: string) => {
    if (!currentUserProfile || currentUserProfile.id === 'guestUser' || currentUserProfile.name === '访客') {
      toast({ title: '评论失败', description: '请先登录或设置昵称才能评论。', variant: 'destructive' });
      throw new Error('用户未登录或未设置昵称');
    }
    try {
      const commentPayload: Omit<Comment, 'id' | 'timestamp'> = {
        userId: currentUserProfile.id,
        userName: currentUserProfile.name,
        userAvatarUrl: currentUserProfile.avatarUrl, // This will be Base64 or path, backend saves as path
        text: commentText,
      };

      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload),
      });

      if (!response.ok) {
        let backendMessage = `评论失败 (状态: ${response.status})`;
        try {
            const errorData = await response.json().catch(() => ({message: '无法解析服务器错误响应'}));
             if (response.status === 404 && errorData.message && errorData.message.toLowerCase().includes('post not found')) {
                backendMessage = `无法评论：帖子 ID "${postId}" 未找到。`;
            } else {
                backendMessage = errorData.message || backendMessage;
            }
            if (errorData.details) backendMessage += ` 详情: ${errorData.details}`;
            console.error(`[CommunityPage] Backend error on commentSubmit (status ${response.status}):`, errorData);
        } catch (e) {
           const responseText = await response.text().catch(() => "无法读取响应文本");
           backendMessage += ` - 服务器: ${responseText.substring(0,100)}...`;
           console.error(`[CommunityPage] Raw error response text on commentSubmit: ${responseText}`);
        }
        throw new Error(backendMessage);
      }
      const updatedPostFromServer: CommunityPost = await response.json();

      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? updatedPostFromServer : p));
      if (viewingPost && viewingPost.id === postId) {
        setViewingPost(prev => prev ? {...prev, ...updatedPostFromServer} : null);
      }
      toast({ title: '评论成功', description: '您的评论已发表。' });
    } catch (error: any) {
      console.error("Error submitting comment from CommunityPage:", error);
      // Error may be re-thrown by PostDetailModal's internal handler
      throw error; // Re-throw to allow PostDetailModal to handle its state
    }
  };

  const handleToggleRecommend = async (postId: string, currentIsRecommended: boolean) => {
    if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
        toast({ title: "权限不足", description: "只有管理员才能推荐帖子。", variant: "destructive" });
        return;
    }
    console.log(`[CommunityPage Admin] Toggling recommendation for post: ${postId} to ${!currentIsRecommended}`);
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/recommend`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recommend: !currentIsRecommended, userId: currentUserProfile.id }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '操作失败' }));
            let backendMessage = errorData.message || `推荐操作失败 (状态: ${response.status})`;
            if (response.status === 404 && errorData.message && errorData.message.toLowerCase().includes('post not found')) {
                backendMessage = `无法操作推荐状态：帖子 ID "${postId}" 未找到。`;
            } else if (response.status === 403) {
                backendMessage = errorData.message || "您没有权限执行此操作。";
            }
            throw new Error(backendMessage);
        }
        const updatedPostFromServer: CommunityPost = await response.json();
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? updatedPostFromServer : p));
        if (viewingPost && viewingPost.id === postId) {
            setViewingPost(prev => prev ? { ...prev, ...updatedPostFromServer } : null);
        }
        toast({ title: "成功", description: `帖子已${!currentIsRecommended ? '设为' : '取消'}推荐。` });
    } catch (error: any) {
        toast({ title: "操作失败", description: (error as Error).message, variant: "destructive" });
        console.error("Error toggling recommendation:", error);
    }
  };


  const filteredAndSortedPosts = useMemo(() => {
    let processedPosts = [...posts];

    if (activeTab === 'recommended') {
        processedPosts = processedPosts.filter(post => post.isRecommended === true);
    }

    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedPosts = processedPosts.filter(post =>
        post.title.toLowerCase().includes(lowerSearchTerm) ||
        post.content.toLowerCase().includes(lowerSearchTerm) ||
        post.userName.toLowerCase().includes(lowerSearchTerm) ||
        (post.associatedPersonaName && post.associatedPersonaName.toLowerCase().includes(lowerSearchTerm))
      );
    }

    switch (sortOrder) {
      case 'mostLiked':
        processedPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'mostCommented':
        processedPosts.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        break;
      case 'newest':
      default:
        processedPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        break;
    }
    return processedPosts;
  }, [posts, searchTerm, sortOrder, activeTab]);


  if (isLoading && posts.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">社区广场</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-5 w-5" /> 创建新帖子
          </Button>
        </div>
        <div className="flex gap-2 mb-6 border-b pb-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
        </div>
         <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-grow" />
          <Skeleton className="h-10 w-full md:w-auto md:min-w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="p-4">
                <div className="flex items-start space-x-3 mb-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-grow space-y-1.5">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <Skeleton className="h-6 w-4/5 mt-1" />
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-grow">
                <Skeleton className="h-4 w-full mb-1.5" />
                <Skeleton className="h-4 w-full mb-1.5" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter className="p-4 border-t flex items-center justify-between">
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">社区广场</h1>
        <Dialog open={isCreatePostDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) closeDialogAndReset(); else setIsCreatePostDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPost(null); setIsCreatePostDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-5 w-5" /> {editingPost ? "编辑帖子" : "创建新帖子"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPost ? "编辑帖子" : "创建新帖子"}</DialogTitle>
              <ShadcnDialogDescription>
                分享你的想法、角色故事或任何与角色扮演相关的内容。
              </ShadcnDialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="post-title">标题</Label>
                <Input
                  id="post-title"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="帖子标题..."
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="post-content">内容</Label>
                <Textarea
                  id="post-content"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="分享你的精彩内容..."
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="post-persona">关联角色卡 (可选)</Label>
                <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId} disabled={isSubmitting}>
                  <SelectTrigger id="post-persona">
                    <SelectValue placeholder="选择一个你创建的角色卡..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联角色</SelectItem>
                    {userPersonas.map(persona => (
                      <SelectItem key={persona.id} value={persona.id}>
                        <div className="flex items-center">
                          {persona.avatarImage && (
                            <Image
                                src={getFullImageUrl(persona.avatarImage)}
                                alt={persona.人设名称}
                                width={20}
                                height={20}
                                className="rounded-full mr-2 object-cover"
                                data-ai-hint="character avatar"
                             />
                          )}
                          {persona.人设名称}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialogAndReset} disabled={isSubmitting}>取消</Button>
              <Button type="button" onClick={handleCreateOrUpdatePost} disabled={isSubmitting}>
                {isSubmitting ? (editingPost ? "更新中..." : "发布中...") : (editingPost ? "更新帖子" : "发布帖子")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all')}
        >
          广场
        </Button>
        <Button
          variant={activeTab === 'recommended' ? 'default' : 'outline'}
          onClick={() => setActiveTab('recommended')}
        >
          <Star className="mr-2 h-4 w-4" />
          推荐
        </Button>
      </div>


      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索帖子、用户或角色名..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-auto">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新发布</SelectItem>
              <SelectItem value="mostLiked">点赞最多</SelectItem>
              <SelectItem value="mostCommented">评论最多</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && filteredAndSortedPosts.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <ImageIconPlaceholder className="h-24 w-24 text-muted-foreground/30 mb-6" strokeWidth={1} />
          <h2 className="text-2xl font-semibold mb-2 text-muted-foreground">
            {activeTab === 'recommended' ? "暂无推荐内容" : (searchTerm ? "没有找到匹配的帖子" : "社区暂无内容")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {activeTab === 'recommended' ? "管理员还没有推荐任何帖子哦。" : (searchTerm ? "尝试更换搜索词或清空搜索。" : "成为第一个发帖的人吧！")}
          </p>
          {activeTab === 'all' && !searchTerm && (
            <Button onClick={() => {
                setEditingPost(null);
                setIsCreatePostDialogOpen(true);
              }}>
              <PlusCircle className="mr-2 h-5 w-5" /> 创建你的第一个帖子
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[calc(100vh-400px)]">
            {filteredAndSortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserProfile={currentUserProfile}
                onDeletePost={handleDeletePost}
                onEditPost={handleEditPost}
                onViewPost={handleViewPost}
                onLikePost={handleLikePost}
                hasUserLikedPost={hasUserLikedPost}
              />
            ))}
          </div>
      )}
      {viewingPost && (
        <PostDetailModal
            post={viewingPost}
            isOpen={!!viewingPost}
            onClose={() => setViewingPost(null)}
            currentUserProfile={currentUserProfile}
            onImportPersona={handleImportPersona}
            onLikePost={handleLikePost}
            onCommentSubmit={handleCommentSubmit}
            hasUserLikedPost={hasUserLikedPost}
            onToggleRecommend={handleToggleRecommend}
        />
      )}
    </div>
  );
}
