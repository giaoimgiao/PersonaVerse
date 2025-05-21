"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, MessageSquare, User, Image as ImageIcon, ThumbsUp, MessageCircle as CommentIcon, Edit3, Trash2, DownloadCloud, BadgePercent } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { CommunityPost, Persona, PersonaData, UserProfile } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton'; 

const ADMIN_USER_ID = "user_752943";
const API_BASE_URL = "http://localhost:7070/api/community"; // New API base URL

interface PostDetailModalProps {
  post: CommunityPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onImportPersona: (personaData: PersonaData, personaName: string) => void;
  onLikePost: (postId: string) => Promise<void>; 
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, isOpen, onClose, currentUserProfile, onImportPersona, onLikePost }) => {
  if (!post) return null;

  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true, locale: zhCN });
  const isAdmin = post.userId === ADMIN_USER_ID;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl break-words">{post.title}</DialogTitle>
          <ShadcnDialogDescription className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.userAvatarUrl} alt={post.userName} data-ai-hint="user avatar"/>
              <AvatarFallback>{post.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <span>{post.userName}</span>
            {isAdmin && <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">管理员</span>}
            <span className="text-xs text-muted-foreground">· {timeAgo}</span>
          </ShadcnDialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 pr-2">
          <div className="whitespace-pre-wrap text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}>
          </div>

          {post.associatedPersonaData && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">关联角色卡</h3>
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={post.associatedPersonaData.avatarImage || post.associatedPersonaAvatarUrl} alt={post.associatedPersonaData.人设名称 || post.associatedPersonaName} data-ai-hint="character avatar" />
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
        </ScrollArea>

        <DialogFooter className="sm:justify-between items-center border-t pt-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => onLikePost(post.id)} disabled={!currentUserProfile}>
              <ThumbsUp className="mr-1.5 h-4 w-4" /> {post.likes || 0}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <CommentIcon className="mr-1.5 h-4 w-4" /> 评论 (开发中)
            </Button>
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
  onDeletePost: (postId: string) => void; 
  onEditPost: (post: CommunityPost) => void;
  onViewPost: (post: CommunityPost) => void;
}> = ({ post, currentUserProfile, onDeletePost, onEditPost, onViewPost }) => {
  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true, locale: zhCN });
  const isOwnPost = currentUserProfile && post.userId === currentUserProfile.id;
  const isAdmin = post.userId === ADMIN_USER_ID;

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="p-4">
        <div className="flex items-start space-x-3 mb-2">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.userAvatarUrl} alt={post.userName} data-ai-hint="user avatar"/>
            <AvatarFallback>{post.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="flex items-center space-x-1.5">
              <p className="text-sm font-semibold text-foreground">{post.userName}</p>
              {isAdmin && <span className="px-1.5 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full leading-none">管理员</span>}
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
                    <ShadcnAlertDialogDescriptionRenamed>帖子 "{post.title}" 将被永久删除。</ShadcnAlertDialogDescriptionRenamed>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeletePost(post.id)} className={buttonVariants({variant: "destructive"})}>确认删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEditPost(post)}>
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <CardTitle className="text-xl leading-tight line-clamp-2 mt-1">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.content}</p>
        {post.associatedPersonaId && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-primary mb-1.5">关联角色：</p>
            <div className="flex items-center space-x-2 p-2 rounded-md bg-accent/10 hover:bg-accent/20 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.associatedPersonaAvatarUrl} alt={post.associatedPersonaName} data-ai-hint="character avatar" />
                <AvatarFallback>{post.associatedPersonaName?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-accent-foreground">{post.associatedPersonaName}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t bg-card/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" disabled>
            <ThumbsUp className="mr-1.5 h-4 w-4" /> {post.likes || 0}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" disabled>
            <CommentIcon className="mr-1.5 h-4 w-4" /> 0
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
  const [userProfile] = useLocalStorage<UserProfile>('userProfile', { 
    id: `user_${Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5)}`, 
    name: '访客' 
  });
  const [userPersonas] = useLocalStorage<Persona[]>('personas', []);
  const { toast } = useToast();

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [viewingPost, setViewingPost] = useState<CommunityPost | null>(null);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '获取帖子失败' }));
        throw new Error(errorData.message);
      }
      const data: CommunityPost[] = await response.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
      toast({ title: '错误', description: (error as Error).message || '无法加载社区帖子。', variant: 'destructive' });
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
      setPostTitle('');
      setPostContent('');
      setSelectedPersonaId(undefined);
    }
  }, [editingPost]);


  const handleCreateOrUpdatePost = async () => {
    if (!userProfile || userProfile.id === 'guestUser' || userProfile.name === '访客') { // Updated check
      toast({ title: '错误', description: '需要登录或设置有效昵称才能发帖。请先在“我的”页面设置您的资料。', variant: 'destructive' });
      return;
    }
    if (!postTitle.trim() || !postContent.trim()) {
      toast({ title: '错误', description: '帖子标题和内容不能为空。', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const selectedPersona = userPersonas.find(p => p.id === selectedPersonaId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const personaDataToStore = selectedPersona ? (({ id, ...rest }) => rest)(selectedPersona) as PersonaData : undefined;

    const postPayload: Omit<CommunityPost, 'id' | 'timestamp'> = { // Ensure type matches what backend expects for creation
      userId: userProfile.id,
      userName: userProfile.name,
      userAvatarUrl: userProfile.avatarUrl,
      title: postTitle,
      content: postContent,
      associatedPersonaId: selectedPersona?.id,
      associatedPersonaName: selectedPersona?.['人设名称'],
      associatedPersonaAvatarUrl: selectedPersona?.avatarImage,
      associatedPersonaData: personaDataToStore,
      likes: editingPost ? editingPost.likes : 0, // Preserve likes if editing
    };

    try {
      let response;
      let url = `${API_BASE_URL}/posts`;
      let method = 'POST';

      if (editingPost) {
        // For a file-based DB, true PUT is tricky. We'll re-implement by fetching all,
        // updating the specific post, and writing all back.
        // Or, a simpler approach for prototyping: just POST again, and let the backend
        // decide if it's an update or new (not ideal, but simpler for file DB).
        // For now, we will just POST, and server-side logic will handle ID generation if needed
        // For a proper update, you'd use PUT to /api/community/posts/${editingPost.id}
        // For this example, we'll assume creating a new post or the backend handles updates via POST.
        // This is a simplification.
        // A proper PUT endpoint would be needed to update `editingPost.id`.
        console.warn("Editing via POST to file-based DB is a simplification. A PUT endpoint is recommended for true updates.");
        toast({ title: '成功', description: '帖子（模拟）已更新！新的后端可能会创建新帖。' });
      }

      response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '操作失败，请重试。' }));
        throw new Error(errorData.message || '操作失败');
      }

      if (!editingPost) toast({ title: '成功', description: '帖子已发布！' });
      
      fetchPosts(); 
      setIsCreatePostDialogOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error(error);
      toast({ title: '操作失败', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, { method: 'DELETE' });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: '删除失败，请重试。' }));
        throw new Error(errorData.message || '删除失败');
      }
      toast({ title: '已删除', description: '帖子已成功删除。' });
      fetchPosts();
    } catch (error) {
      toast({ title: '删除失败', description: (error as Error).message, variant: 'destructive' });
      console.error("Error deleting post:", error);
    }
  };

  const handleViewPost = (post: CommunityPost) => {
    setViewingPost(post);
  };
  
  const closeDialogAndReset = () => {
    setIsCreatePostDialogOpen(false);
    setEditingPost(null);
  };

  const handleImportPersona = (personaDataToImport: PersonaData, personaName: string) => {
    if (!userProfile || userProfile.id === 'guestUser' || userProfile.name === '访客') {
        toast({ title: '导入失败', description: '请先在“我的”页面设置您的用户资料。', variant: 'destructive' });
        return;
    }
     const existingPersonas = JSON.parse(localStorage.getItem('personas') || '[]') as Persona[];
     const newPersona: Persona = {
        ...personaDataToImport,
        id: `imported_${Date.now().toString()}_${Math.random().toString(36).substring(2, 7)}`,
        人设名称: `${personaName} (导入)`, 
     };
     localStorage.setItem('personas', JSON.stringify([...existingPersonas, newPersona]));

    toast({ title: '导入成功', description: `角色 "${newPersona.人设名称}" 已添加到您的角色列表。` });
    setViewingPost(null); 
  };

  const handleLikePost = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, { method: 'PUT' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '点赞失败，请重试。'}));
        throw new Error(errorData.message || '点赞失败');
      }
      // const updatedPost = await response.json();
      // setPosts(prevPosts => prevPosts.map(p => p.id === postId ? updatedPost : p));
      fetchPosts(); // Re-fetch to update like count, simpler for now
      toast({title: "点赞成功", description: "感谢您的点赞！"});
    } catch (error) {
        toast({title: "点赞失败", description: (error as Error).message, variant: "destructive"});
        console.error("Error liking post:", error);
    }
  };


  if (isLoading && posts.length === 0) { 
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">社区广场</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-5 w-5" /> 创建新帖子
          </Button>
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">社区广场</h1>
        <Dialog open={isCreatePostDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) closeDialogAndReset(); else setIsCreatePostDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button>
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
                                src={persona.avatarImage} 
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

      {!isLoading && posts.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <ImageIcon className="h-24 w-24 text-muted-foreground/30 mb-6" strokeWidth={1} />
          <h2 className="text-2xl font-semibold mb-2 text-muted-foreground">社区暂无内容</h2>
          <p className="text-muted-foreground mb-6">成为第一个发帖的人吧！</p>
          <Button onClick={() => { setEditingPost(null); setIsCreatePostDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-5 w-5" /> 创建你的第一个帖子
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] pr-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserProfile={userProfile}
                onDeletePost={handleDeletePost}
                onEditPost={handleEditPost}
                onViewPost={handleViewPost}
              />
            ))}
          </div>
        </ScrollArea>
      )}
      <PostDetailModal
        post={viewingPost}
        isOpen={!!viewingPost}
        onClose={() => setViewingPost(null)}
        currentUserProfile={userProfile}
        onImportPersona={handleImportPersona}
        onLikePost={handleLikePost}
      />
    </div>
  );
}