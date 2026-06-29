import { Bell, Compass, Home, MessageCircle, User } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageCircle, badgeKey: 'messages' as const },
  { href: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' as const },
  { href: '/profile', label: 'Profile', icon: User },
];
