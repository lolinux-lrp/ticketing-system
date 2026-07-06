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

  // ----------------------------------------------------------------------
  // TODO (Gap 1 - Fetching Data):
  // Import and call your GET query hook here (e.g., useGetCommentsQuery).
  // Pass the ticketId as the query argument.
  // Destructure the resulting object to get:
  // - data (rename it to 'comments' and default to [])
  // - isLoading
  // Example: const { data: comments = [], isLoading } = useGetCommentsQuery(ticketId);
  // ----------------------------------------------------------------------
  const { data: comments = [], isLoading } = useGetCommentsQuery(ticketId);
  

  // ----------------------------------------------------------------------
  // TODO (Gap 2 - Mutations Setup):
  // Import and call your CREATE and DELETE mutation hooks here.
  // - For create: const [createComment, { isLoading: isSubmitting }] = useCreateCommentMutation();
  // - For delete: const [deleteComment] = useDeleteCommentMutation();
  // ----------------------------------------------------------------------
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
      await deleteComment(commentId).unwrap();
      
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
