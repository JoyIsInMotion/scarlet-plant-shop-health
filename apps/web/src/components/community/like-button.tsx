'use client';
import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from '@/i18n/navigation';

interface LikeButtonProps {
  plantId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ plantId, initialLiked, initialCount }: LikeButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/community/plants/${plantId}/like`, {
          method: 'POST',
        });
        if (!res.ok) return;
        const { data } = await res.json();
        setLiked(data.liked);
        setCount(data.likesCount);
      } catch {
        // silent
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        liked
          ? 'bg-scarlet/10 text-scarlet hover:bg-scarlet/20'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-scarlet'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-scarlet text-scarlet' : ''}`} />
      {count}
    </button>
  );
}
