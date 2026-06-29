'use client';

import { useParams } from 'next/navigation';
import { ChatThread } from '@/components/chat/chat-thread';

export default function ConversationPage() {
  const params = useParams();
  const id = params?.id as string;
  return <ChatThread conversationId={id} />;
}
