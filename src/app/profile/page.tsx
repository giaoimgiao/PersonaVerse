
"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; 
import { User, ShieldAlert } from 'lucide-react';
import { ADMIN_USER_ID } from '@/lib/constants';


const defaultProfile: UserProfile = {
  id: `user_${typeof window !== 'undefined' ? Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5) : Math.random().toString(36).substring(2, 8)}`,
  name: "访客",
  avatarUrl: undefined,
};

export default function ProfilePage() {
  const [profile, setProfile] = useLocalStorage<UserProfile>('userProfile', defaultProfile);
  const [nameInput, setNameInput] = useState('');
  const { toast } = useToast();
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setNameInput(profile.name);
      setAvatarPreview(profile.avatarUrl || null);
    }
  }, [profile]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(profile?.avatarUrl || null);
    }
  };

  const handleSaveProfile = () => {
    if (!nameInput.trim()) {
      toast({ title: "错误", description: "昵称不能为空。", variant: "destructive" });
      return;
    }
    
    let newAvatarUrl = profile?.avatarUrl; 
    if (avatarFile && avatarPreview) { 
        newAvatarUrl = avatarPreview; 
    } else if (!avatarPreview && !avatarFile) { 
        newAvatarUrl = undefined;
    }

    setProfile(prev => ({ 
      ...(prev || defaultProfile), 
      name: nameInput.trim(),
      avatarUrl: newAvatarUrl,
      id: prev?.id && prev.id !== 'guestUser' ? prev.id : defaultProfile.id 
    }));
    
    setAvatarFile(null); 
    toast({ title: "资料已更新", description: "您的个人资料已保存。" });
  };

  const handleBecomeAdmin = () => {
    setProfile(prev => ({
      ...(prev || defaultProfile),
      id: ADMIN_USER_ID,
      name: prev?.name.includes("(管理员)") ? prev.name : `${prev?.name || '用户'} (管理员)`
    }));
    toast({ title: "权限已更新", description: `您现在是管理员 (ID: ${ADMIN_USER_ID})。请刷新其他页面以查看更改。` });
  };

  const currentAvatarSrc = avatarPreview || `https://placehold.co/128x128.png?text=${nameInput?.[0]?.toUpperCase() || 'U'}`;

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={currentAvatarSrc} alt={profile?.name} data-ai-hint="user avatar"/>
              <AvatarFallback>
                {nameInput ? nameInput.charAt(0).toUpperCase() : <User className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-3xl">{nameInput || "访客"}</CardTitle>
          <CardDescription>用户 ID: {profile?.id || defaultProfile.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">显示名称</Label>
            <Input 
              id="name" 
              value={nameInput} 
              onChange={(e) => setNameInput(e.target.value)} 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="avatarUpload" className="text-sm font-medium">上传头像</Label>
            <Input 
              id="avatarUpload" 
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleAvatarChange}
              className="mt-1"
            />
            {avatarPreview && (
              <div className="mt-4 flex justify-center">
                <Image 
                    src={avatarPreview} 
                    alt="头像预览" 
                    width={100} 
                    height={100} 
                    className="rounded-lg object-cover"
                    data-ai-hint="avatar preview"
                />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="userId" className="text-sm font-medium">用户 ID (只读)</Label>
            <Input 
              id="userId" 
              value={profile?.id || defaultProfile.id} 
              readOnly 
              disabled
              className="mt-1 bg-muted/50"
            />
          </div>
           <CardDescription className="text-xs pt-4 text-center">
            注意：密码设置功能需要后端支持，当前版本未实现。
          </CardDescription>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleSaveProfile} className="w-full">保存资料</Button>
          {profile?.id !== ADMIN_USER_ID && (
            <Button variant="outline" onClick={handleBecomeAdmin} className="w-full">
              <ShieldAlert className="mr-2 h-4 w-4" /> 设为管理员 (测试用)
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
