'use client';

import { ProfileView } from '@/components/profile/profile-view';
import { useApp } from '@/lib/store';

export default function MyProfilePage() {
  const { me } = useApp();
  return <ProfileView user={me} />;
}
