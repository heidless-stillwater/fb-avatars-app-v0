'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthForm from '@/components/auth-form';
import { useUser } from '@/firebase';

export default function AuthPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </main>
  );
}
