'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProfileView } from '@/components/profile/profile-view';
import { useApp } from '@/lib/store';

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { users } = useApp();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return <div className="grid h-screen place-items-center text-white/40">User not found.</div>;
  }

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-black px-5 py-3 sm:px-8">
        <Link href="/discover" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="kicker">Profile</span>
      </div>
      <ProfileView user={user} />
    </div>
  );
}
