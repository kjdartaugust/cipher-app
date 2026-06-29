'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { ProfileView } from '@/components/profile/profile-view';
import { useApp } from '@/lib/store';

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { users } = useApp();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return (
      <div className="grid h-screen place-items-center text-white/40">User not found.</div>
    );
  }

  return (
    <div>
      <PageHeader
        title={user.name}
        action={
          <Link href="/discover" className="rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
      />
      <ProfileView user={user} />
    </div>
  );
}
