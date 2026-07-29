"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGetMeetingsQuery, useDeleteMeetingMutation } from "@/store/meetingsApi";
import { useGetTicketQuery } from "@/store/ticketsApi";
import { ScheduleMeetingModal } from "@/components/meetings/ScheduleMeetingModal";
import { LocalTime } from "@/components/ui/LocalTime";
import type { SerializedMeetingWithAttendees } from "@/store/meetingsApi";


function MeetingItem({ meeting, now, isTicketCreator, isTicketContact }: { meeting: SerializedMeetingWithAttendees; now: number; isTicketCreator: boolean; isTicketContact: boolean }) {
  const { data: session } = useSession();
  const [deleteMeeting, { isLoading: isDeleting }] = useDeleteMeetingMutation();

  const startMs = new Date(meeting.startTime).getTime();
  const isWithin15Mins = now >= startMs - 15 * 60 * 1000;
  const isPastEnd = now >= new Date(meeting.endTime).getTime();

  const amIHost = meeting.createdById === session?.user?.id;
  const canCancel = amIHost || isTicketCreator || isTicketContact;
  const isCancelled = meeting.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed" style={{ borderColor: isCancelled ? "var(--border)" : "var(--border)", opacity: isCancelled ? 0.6 : 1 }}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{meeting.title}</h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            <span className="font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
              <LocalTime date={meeting.startTime} options={{ weekday: "short", month: "short", day: "numeric" }} />
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">
              <LocalTime date={meeting.startTime} options={{ hour: "numeric", minute: "2-digit" }} /> – <LocalTime date={meeting.endTime} options={{ hour: "numeric", minute: "2-digit" }} />
            </span>
          </div>
        </div>
        {isCancelled ? (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-400/10 text-gray-500">
            CANCELLED
          </span>
        ) : (
          <>
            {!isPastEnd && canCancel && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this meeting?")) {
                      deleteMeeting({ id: meeting.id, ticketId: meeting.ticketId || undefined }).unwrap().catch((err: { data?: { error?: string } }) => {
                        alert(err?.data?.error || "Failed to cancel meeting. Please try again.");
                      });
                    }
                  }}
                  disabled={isDeleting}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                >
                  CANCEL MEETING
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Host</span>
        <span className="text-xs truncate min-w-0 block" style={{ color: "var(--text-secondary)" }} title={meeting.createdBy.name || meeting.createdBy.email || undefined}>{meeting.createdBy.name || meeting.createdBy.email}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Attendees ({meeting.attendees.length})</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {meeting.attendees.map(a => {
            const hasUser = !!a.user;
            const displayName = a.user?.name || a.user?.email || a.email;
            return (
              <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded flex items-center min-w-0" style={{ background: "var(--surface-2)", color: hasUser ? "var(--text-secondary)" : "var(--text-muted)", fontStyle: hasUser ? "normal" : "italic" }}>
                <span className="truncate min-w-0" title={displayName || undefined}>{displayName}</span>
              </span>
            );
          })}
        </div>
      </div>

      {!isCancelled && !isPastEnd && (
        <div className="mt-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          {meeting.meetingUrl && isWithin15Mins ? (
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--brand)" }}
            >
              Join Google Meet
            </a>
          ) : (
            <button
              disabled
              className="w-full text-center py-2 rounded-lg text-xs font-bold transition-colors cursor-not-allowed"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Room opens 15m before start
            </button>
          )}
        </div>
      )}
      {isCancelled && (
        <div className="mt-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="w-full text-center py-2 rounded-lg text-xs font-bold bg-gray-500/10 text-gray-500">
            This meeting has been cancelled
          </div>
        </div>
      )}
    </div>
  );
}


export function TicketMeetingsCard({ 
  ticketId, 
  ticketTitle,
  customerUserId,
  agentUserId
}: { 
  ticketId: string; 
  ticketTitle?: string;
  customerUserId?: string;
  agentUserId?: string | null;
}) {
  const { data: session } = useSession();
  const { data, isLoading } = useGetMeetingsQuery();
  const { data: ticketData } = useGetTicketQuery(ticketId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter meetings for this specific ticket
  const ticketMeetings = data?.data?.filter((m) => m.ticketId === ticketId) || [];

  // Active = not globally cancelled
  const activeMeetings = ticketMeetings.filter((m) => m.status !== "CANCELLED");

  // Historical audit log keeps cancelled records for context
  const cancelledMeetings = ticketMeetings.filter((m) => m.status === "CANCELLED");

  // Sort active: upcoming first, then past
  const upcoming = activeMeetings
    .filter((m) => new Date(m.endTime).getTime() > (now ?? 0))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const past = activeMeetings
    .filter((m) => new Date(m.endTime).getTime() <= (now ?? 0))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const sortedMeetings = [...upcoming, ...past, ...cancelledMeetings];

  const defaultAttendees = Array.from(new Set([customerUserId, agentUserId]))
    .filter((id): id is string => Boolean(id) && id !== session?.user?.id);

  const isTicketCreator = ticketData?.ticket?.createdById === session?.user?.id;
  const isTicketContact = !!(ticketData?.ticket?.contactEmail && session?.user?.email && ticketData.ticket.contactEmail === session.user.email);

  return (
    <>
      <div 
        className="rounded-xl p-4 flex flex-col gap-4"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Meetings
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
            style={{ color: "var(--brand)" }}
          >
            + Schedule
          </button>
        </div>

        {isLoading || now === null ? (
          <div className="animate-pulse h-24 rounded-xl" style={{ background: "var(--surface-2)" }} />
        ) : ticketMeetings.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No meetings scheduled for this ticket.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {sortedMeetings.map(m => (
              <MeetingItem key={m.id} meeting={m} now={now} isTicketCreator={isTicketCreator} isTicketContact={isTicketContact} />
            ))}
          </div>
        )}
      </div>

      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ticketId={ticketId}
        defaultTitle={ticketTitle || `Ticket ${ticketId.slice(-6)}`}
        defaultAttendeeIds={defaultAttendees}
        onSuccess={() => setIsModalOpen(false)}
      />
    </>
  );
}
