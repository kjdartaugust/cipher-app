'use client';

import { PageHeader } from '@/components/shell/page-header';
import { ProfileView } from '@/components/profile/profile-view';
import { useApp } from '@/lib/store';

export default function MyProfilePage() {
  const { me } = useApp();
  return (
    <div>
      <PageHeader title={me.name} />
      <ProfileView user={me} />
    </div>
  );
}
