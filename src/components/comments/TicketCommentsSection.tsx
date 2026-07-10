"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useGetCommentsQuery,useCreateCommentMutation,useDeleteCommentMutation } from "@/store/commentsApi";
import { CommentsUI } from "./CommentsUI";

interface TicketCommentsSectionProps {
  ticketId: string;
}

export const TicketCommentsSection: React.FC<TicketCommentsSectionProps> = ({ ticketId }) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";

  const { data: comments = [], isLoading } = useGetCommentsQuery(ticketId, {
    pollingInterval: 10000,        // re-fetch every 10 seconds
    skipPollingIfUnfocused: true,  // pause polling when tab is in the background
  });

  const [createComment, { isLoading: isSubmitting }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const handleAddComment = async (content: string) => {
    try {
      if (!currentUserId) {
        console.error("Must be logged in to comment.");
        return;
      }
      
      await createComment({ ticketId, authorId: currentUserId, content }).unwrap();
      
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment({ commentId, ticketId }).unwrap();
      
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  return (
    <CommentsUI
      comments={comments}
      isLoading={isLoading}
      currentUserId={currentUserId}
      isSubmitting={isSubmitting}
      onAddComment={handleAddComment}
      onDeleteComment={handleDeleteComment}
    />
  );
};
