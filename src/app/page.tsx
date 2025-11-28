'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import FileManager from '@/components/file-manager';
import { useUser } from '@/firebase';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full">
      <div className="w-full max-w-7xl mx-auto h-full">
        <FileManager />
      </div>
    </div>
  );
}
