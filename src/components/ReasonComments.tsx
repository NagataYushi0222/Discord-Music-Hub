import { Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { ReasonComment } from "../types";
import { formatDateTime } from "../lib/format";

type ReasonCommentsProps = {
  comments: ReasonComment[];
  onAddComment: (body: string, parentCommentId?: string | null) => void;
  onLikeComment: (comment: ReasonComment) => void;
};

type CommentComposerProps = {
  placeholder: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
};

function CommentComposer({
  placeholder,
  autoFocus,
  onSubmit,
}: CommentComposerProps) {
  const [body, setBody] = useState("");

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setBody("");
  };

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input
        value={body}
        autoFocus={autoFocus}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            submit();
          }
        }}
        placeholder={placeholder}
        className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        className="focus-ring grid h-10 w-10 place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
        aria-label="コメントを追加"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

function CommentItem({
  comment,
  depth,
  onAddComment,
  onLikeComment,
}: {
  comment: ReasonComment;
  depth: number;
  onAddComment: (body: string, parentCommentId?: string | null) => void;
  onLikeComment: (comment: ReasonComment) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-200 bg-white p-3",
        depth > 0 && "ml-7 border-l-4 border-l-indigo-100",
      )}
    >
      <div className="flex items-start gap-3">
        <img
          src={comment.user.avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-800">
              {comment.user.username}
            </span>
            <span className="text-xs text-slate-500">
              {formatDateTime(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {comment.body}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onLikeComment(comment)}
              className={clsx(
                "focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1",
                comment.likedByMe
                  ? "text-rose-500"
                  : "text-slate-500 hover:text-rose-500",
              )}
            >
              <Heart
                className={clsx(
                  "h-4 w-4",
                  comment.likedByMe && "fill-current",
                )}
              />
              {comment.likes}
            </button>
            <button
              type="button"
              onClick={() => setReplyOpen((current) => !current)}
              className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-blue-600 hover:bg-blue-50"
            >
              <MessageCircle className="h-4 w-4" />
              comments {comment.replies.length}
            </button>
          </div>
          {replyOpen ? (
            <div className="mt-2">
              <CommentComposer
                autoFocus
                placeholder="返信を追加"
                onSubmit={(nextBody) => onAddComment(nextBody, comment.id)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {comment.replies.length ? (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onAddComment={onAddComment}
              onLikeComment={onLikeComment}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReasonComments({
  comments,
  onAddComment,
  onLikeComment,
}: ReasonCommentsProps) {
  return (
    <div className="space-y-2">
      <CommentComposer
        placeholder="おすすめ理由にコメント"
        onSubmit={(body) => onAddComment(body, null)}
      />
      {comments.length ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              onAddComment={onAddComment}
              onLikeComment={onLikeComment}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
          まだコメントはありません
        </p>
      )}
    </div>
  );
}
