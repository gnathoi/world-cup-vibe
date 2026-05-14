import type { Comment } from "@/lib/types";

type Props = { comment: Comment };

export default function BanterPost({ comment }: Props) {
  const initial = comment.participantDisplayName.charAt(0).toUpperCase();
  const time = new Date(comment.postedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3 py-3 border-b border-ink/10 last:border-b-0">
      <span
        aria-hidden
        className="w-8 h-8 bg-sepia text-ink font-display flex items-center justify-center"
      >
        {initial}
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm text-ink">
          <span className="font-display text-base text-ink mr-2">
            {comment.participantDisplayName}
          </span>
          {comment.body}
        </p>
        <span className="font-mono text-[10px] tracking-widest text-ink/50 uppercase">
          {time}
        </span>
      </div>
    </li>
  );
}
