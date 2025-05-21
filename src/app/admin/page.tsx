
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserProfile, CommunityPost } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as ShadcnAlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Star, ShieldAlert, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ADMIN_USER_ID } from '@/lib/constants';

const API_BASE_URL = "/api";

export default function AdminPage() {
  const [currentUserProfile] = useLocalStorage<UserProfile | null>('userProfile', null);
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const fetchAllPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '获取所有帖子失败' }));
        throw new Error(errorData.message);
      }
      const data: CommunityPost[] = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching all posts for admin:", error);
      toast({ title: '错误', description: (error as Error).message || '无法加载帖子列表。', variant: 'destructive' });
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
      toast({ title: '无权限', description: '您没有权限访问此页面。', variant: 'destructive' });
      router.push('/');
      return;
    }
    fetchAllPosts();
  }, [currentUserProfile, router, toast, fetchAllPosts]);

  const handleDeletePost = async (postId: string) => {
    if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
        toast({ title: '无权限', description: '只有管理员才能删除帖子。', variant: 'destructive' });
        return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '删除帖子失败' }));
        let backendMessage = errorData.message || `删除失败 (状态: ${response.status})`;
        if (response.status === 404 && backendMessage.toLowerCase().includes('post not found')) {
            backendMessage = `无法删除：帖子 ID "${postId}" 未找到。可能已被删除。`;
        }
        throw new Error(backendMessage);
      }
      toast({ title: '成功', description: '帖子已删除。' });
      fetchAllPosts();
    } catch (error) {
      toast({ title: '删除失败', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleToggleRecommend = async (postId: string, currentIsRecommended: boolean) => {
     if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
        toast({ title: '无权限', description: '只有管理员才能操作推荐。', variant: 'destructive' });
        return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/recommend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommend: !currentIsRecommended, userId: currentUserProfile.id }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '操作失败' }));
        let backendMessage = errorData.message || `推荐操作失败 (状态: ${response.status})`;
         if (response.status === 404 && backendMessage.toLowerCase().includes('post not found')) {
            backendMessage = `无法操作：帖子 ID "${postId}" 未找到。`;
        } else if (response.status === 403) {
            backendMessage = errorData.message || "您没有权限执行此操作。";
        }
        throw new Error(backendMessage);
      }
      toast({ title: '成功', description: `帖子已${!currentIsRecommended ? '设为' : '取消'}推荐。` });
      fetchAllPosts();
    } catch (error) {
      toast({ title: '操作失败', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleToggleHot = async (postId: string, currentIsHot: boolean) => {
    if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
        toast({ title: '无权限', description: '只有管理员才能操作热门状态。', variant: 'destructive' });
        return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/set-hot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHot: !currentIsHot, userId: currentUserProfile.id }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '操作失败' }));
        throw new Error(errorData.message);
      }
      toast({ title: '成功', description: `帖子已${!currentIsHot ? '设为' : '取消'}热门。` });
      fetchAllPosts();
    } catch (error) {
      toast({ title: '操作失败', description: (error as Error).message, variant: 'destructive' });
    }
  };


  if (!currentUserProfile || currentUserProfile.id !== ADMIN_USER_ID) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold">无访问权限</h1>
        <p className="text-muted-foreground">正在重定向到主页...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <CardDescription>管理社区内容和用户。</CardDescription>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>帖子管理</CardTitle>
            <CardDescription>查看、删除和管理社区帖子。</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPosts ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground">暂无帖子。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">标题</TableHead>
                    <TableHead>作者</TableHead>
                    <TableHead>发布时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium truncate max-w-xs">{post.title}</TableCell>
                      <TableCell>{post.userName} ({post.userId})</TableCell>
                      <TableCell>{post.timestamp ? format(new Date(post.timestamp), 'yyyy-MM-dd HH:mm') : '未知时间'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {post.isRecommended && <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-primary-foreground"><Star className="mr-1 h-3 w-3"/>推荐</Badge>}
                          {post.isManuallyHot && <Badge variant="destructive"><Flame className="mr-1 h-3 w-3"/>热门</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggleRecommend(post.id, !!post.isRecommended)}>
                          <Star className="mr-1 h-3 w-3" /> {post.isRecommended ? '取消推荐' : '推荐'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggleHot(post.id, !!post.isManuallyHot)}>
                           <Flame className="mr-1 h-3 w-3" /> {post.isManuallyHot ? '取消热门' : '设为热门'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-1 h-3 w-3" /> 删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除帖子?</AlertDialogTitle>
                              <ShadcnAlertDialogDescription>
                                帖子 "{post.title}" 将被永久删除。此操作无法撤销。
                              </ShadcnAlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id)}>确认删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>用户管理 (开发中)</CardTitle>
            <CardDescription>管理用户权限、头衔等。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">此功能正在开发中。</p>
          </CardContent>
        </Card>
      </section>
      
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>社区设置 (开发中)</CardTitle>
            <CardDescription>更改社区介绍、规则等。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">此功能正在开发中。</p>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
