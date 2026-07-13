"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGetMeetingsQuery, useUpdateMeetingMutation } from "@/store/meetingsApi";
import { ScheduleMeetingModal } from "@/components/meetings/ScheduleMeetingModal";
import { LocalTime } from "@/components/ui/LocalTime";
import type { AttendeeStatusValue } from "@/types/meeting";
import type { SerializedMeetingWithAttendees } from "@/store/meetingsApi";

// ---------------------------------------------------------------------------
// Single Meeting Item Row
// ---------------------------------------------------------------------------

function MeetingItem({ meeting, now }: { meeting: SerializedMeetingWithAttendees; now: number }) {
  const { data: session } = useSession();
  const [updateMeeting, { isLoading }] = useUpdateMeetingMutation();

  const startMs = new Date(meeting.startTime).getTime();
  const isWithin15Mins = now >= startMs - 15 * 60 * 1000;
  const isPastEnd = now >= new Date(meeting.endTime).getTime();

  const handleRSVP = (status: AttendeeStatusValue) => {
    updateMeeting({ id: meeting.id, body: { attendeeStatus: status } });
  };

  const myAttendeeRecord = meeting.attendees.find(
    (a) => a.userId === session?.user?.id
  );
  const amIHost = meeting.createdById === session?.user?.id;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{meeting.title}</h4>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <LocalTime date={meeting.startTime} options={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} /> - <LocalTime date={meeting.endTime} options={{ hour: "numeric", minute: "2-digit" }} />
          </p>
        </div>
        {!isPastEnd && myAttendeeRecord && !amIHost && myAttendeeRecord.status === "PENDING" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleRSVP("ACCEPTED")}
              disabled={isLoading}
              className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            >
              ACCEPT
            </button>
            <button
              onClick={() => handleRSVP("DECLINED")}
              disabled={isLoading}
              className="px-2 py-1 text-[10px] font-bold rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            >
              DECLINE
            </button>
          </div>
        )}
        {!isPastEnd && myAttendeeRecord && myAttendeeRecord.status !== "PENDING" && (
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            myAttendeeRecord.status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
          }`}>
            {myAttendeeRecord.status}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Host</span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{meeting.createdBy.name || meeting.createdBy.email}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Attendees ({meeting.attendees.length})</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {meeting.attendees.map(a => (
            <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              {a.user.name || a.user.email}
              <span className={`ml-1 ${a.status === 'ACCEPTED' ? 'text-emerald-500' : a.status === 'DECLINED' ? 'text-rose-500' : 'text-amber-500'}`}>
                •
              </span>
            </span>
          ))}
        </div>
      </div>

      {!isPastEnd && (
        <div className="mt-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          {myAttendeeRecord?.status === "DECLINED" ? (
            <div className="w-full text-center py-2 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600">
              You Declined
            </div>
          ) : myAttendeeRecord?.status === "CANCELLED" ? (
            <div className="w-full text-center py-2 rounded-lg text-xs font-bold bg-gray-500/10 text-gray-500">
              Meeting Cancelled
            </div>
          ) : isWithin15Mins ? (
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card Container
// ---------------------------------------------------------------------------

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
  
  // Sort: partition by whether endTime is <= now
  const upcoming = ticketMeetings
    .filter((m) => new Date(m.endTime).getTime() > (now ?? 0))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const past = ticketMeetings
    .filter((m) => new Date(m.endTime).getTime() <= (now ?? 0))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const sortedMeetings = [...upcoming, ...past];

  // Decide who to invite automatically (excluding myself, and deduplicating)
  const defaultAttendees = Array.from(new Set([customerUserId, agentUserId]))
    .filter((id): id is string => Boolean(id) && id !== session?.user?.id);

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
              <MeetingItem key={m.id} meeting={m} now={now} />
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
