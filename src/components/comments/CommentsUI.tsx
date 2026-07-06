"use client";

import React, { useState } from "react";

export interface CommentUIItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

export interface CommentsUIProps {
  comments: CommentUIItem[];
  isLoading: boolean;
  currentUserId: string;
  isSubmitting: boolean;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export const CommentsUI: React.FC<CommentsUIProps> = ({
  comments,
  isLoading,
  currentUserId,
  isSubmitting,
  onAddComment,
  onDeleteComment,
}) => {
  const [newComment, setNewComment] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteComment(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "AGENT":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse mt-8">
        <div className="h-6 w-32 bg-gray-200 rounded"></div>
        {[1, 2].map((i) => (
          <div key={i} className="flex space-x-4 border rounded-lg p-4">
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Comments</h3>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No comments yet. Be the first to start the conversation!</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{comment.author.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                      comment.author.role
                    )}`}
                  >
                    {comment.author.role}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {comment.author.id === currentUserId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 text-sm flex items-center"
                    aria-label="Delete comment"
                  >
                    {deletingId === comment.id ? (
                      <span className="inline-block animate-spin mr-1 border-2 border-gray-400 border-t-transparent rounded-full w-4 h-4" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <div className="text-gray-700 whitespace-pre-wrap text-sm">
                {comment.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label htmlFor="comment" className="sr-only">
          Add your comment
        </label>
        <textarea
          id="comment"
          rows={3}
          className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 bg-white"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="mt-3 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
