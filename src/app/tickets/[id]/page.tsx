"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    useGetTicketQuery,
    useUpdateTicketMutation,
    useAddCommentMutation,
    useGetAgentsQuery,
} from "@/store/ticketsApi";

const statusOptions = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    RESOLVED: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-600",
    HIGH: "bg-orange-100 text-orange-600",
    URGENT: "bg-red-100 text-red-600",
};

export default function TicketDetailPage() {
    const params = useParams();
    const ticketId = params.id as string;
    const { data: session } = useSession();
    const { data, isLoading, isError } = useGetTicketQuery(ticketId);
    const { data: agents } = useGetAgentsQuery(undefined, {
        skip: session?.user?.role !== "ADMIN",
    });
    const [updateTicket] = useUpdateTicketMutation();
    const [addComment, { isLoading: isCommenting }] = useAddCommentMutation();
    const [commentText, setCommentText] = useState("");

    const isAdmin = session?.user?.role === "ADMIN";
    const isAgent = session?.user?.role === "AGENT";
    const canManage = isAdmin || isAgent;

    async function handleCommentSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            await addComment({ ticketId, content: commentText }).unwrap();
            setCommentText("");
        } catch (err) {
            alert("Failed to add comment.");
        }
    }

    if (isLoading) return <div className="p-8 text-gray-500">Loading ticket...</div>;
    if (isError || !data) return <div className="p-8 text-red-600">Failed to load ticket.</div>;

    const { ticket } = data;

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                ← Back to dashboard
            </Link>

            <div className="mt-4 bg-white border rounded-lg p-6">
                <div className="flex justify-between items-start gap-4">
                    <h1 className="text-xl font-semibold">{ticket.title}</h1>
                    <div className="flex gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[ticket.status]}`}>
                            {ticket.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[ticket.priority]}`}>
                            {ticket.priority}
                        </span>
                    </div>
                </div>

                <p className="text-gray-700 mt-3">{ticket.description}</p>

                {ticket.workDone && (
                    <div className="mt-4 p-4 bg-slate-50 border rounded-md">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Agent Progress</h3>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.workDone}</p>
                    </div>
                )}

                <div className="text-sm text-gray-500 mt-4 space-y-1">
                    <p>Created by {ticket.createdBy?.name}</p>
                    <p>Assigned to {ticket.assignedTo?.name ?? "Unassigned"}</p>
                </div>

                {canManage && (
                    <div className="flex gap-3 mt-4 pt-4 border-t">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Status</label>
                            <select
                                value={ticket.status}
                                onChange={(e) => updateTicket({ id: ticketId, status: e.target.value })}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                {statusOptions.map((s) => (
                                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Priority</label>
                            <select
                                value={ticket.priority}
                                onChange={(e) => updateTicket({ id: ticketId, priority: e.target.value })}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                {priorityOptions.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        {isAdmin && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Assignee</label>
                                <select
                                    value={ticket.assignedToId || ""}
                                    onChange={(e) => updateTicket({ id: ticketId, assignedToId: e.target.value || null })}
                                    className="border rounded px-2 py-1 text-sm"
                                >
                                    <option value="">Unassigned</option>
                                    {agents?.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isAgent && ticket.assignedToId !== session?.user?.id && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => updateTicket({ id: ticketId, assignedToId: session?.user?.id })}
                                    className="border rounded px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200"
                                >
                                    Assign to me
                                </button>
                            </div>
                        )}
                        {isAgent && ticket.assignedToId === session?.user?.id && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => updateTicket({ id: ticketId, assignedToId: null })}
                                    className="border rounded px-3 py-1 text-sm text-red-600 bg-red-50 hover:bg-red-100"
                                >
                                    Unassign
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6">
                <h2 className="font-medium mb-3">Comments</h2>

                <div className="space-y-3 mb-4">
                    {ticket.comments.length === 0 && (
                        <p className="text-sm text-gray-500">No comments yet.</p>
                    )}
                    {ticket.comments.map((comment: any) => (
                        <div key={comment.id} className="bg-white border rounded-lg p-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span className="font-medium text-gray-700">{comment.author.name}</span>
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={isCommenting}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isCommenting ? "Posting..." : "Post"}
                    </button>
                </form>
            </div>
        </div>
    );
}