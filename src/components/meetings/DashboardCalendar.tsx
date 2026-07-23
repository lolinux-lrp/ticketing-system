"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGetMeetingsQuery, useUpdateMeetingMutation, useDeleteMeetingMutation } from "@/store/meetingsApi";
import type { SerializedMeetingWithAttendees } from "@/store/meetingsApi";
import { LocalTime } from "@/components/ui/LocalTime";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Schedule Item Row
// ---------------------------------------------------------------------------

function ScheduleItem({ meeting, now }: { meeting: SerializedMeetingWithAttendees; now: number }) {
  const { data: session } = useSession();
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const [deleteMeeting, { isLoading: isDeleting }] = useDeleteMeetingMutation();
  const [expanded, setExpanded] = useState(false);

  const startMs = new Date(meeting.startTime).getTime();
  const isWithin15Mins = now >= startMs - 15 * 60 * 1000;
  const isPastEnd = now >= new Date(meeting.endTime).getTime();

  const handleRSVP = (status: "ACCEPTED" | "DECLINED") => {
    updateMeeting({ id: meeting.id, body: { attendeeStatus: status } });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this meeting?")) {
      deleteMeeting(meeting.id);
    }
  };

  const myAttendeeRecord = meeting.attendees.find(
    (a) => a.userId === session?.user?.id
  );
  const amIHost = meeting.createdById === session?.user?.id;

  const isPending = !isPastEnd && myAttendeeRecord && !amIHost && myAttendeeRecord.status === "PENDING";

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden transition-colors ${isPastEnd ? 'opacity-60' : ''}`} style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      {/* Clickable Header Area */}
      <div className="w-full flex items-center justify-between p-4 transition-colors hover:bg-black/5">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-4 text-left"
        >
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg shrink-0" style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
            <span className="text-xs font-bold uppercase" style={{ color: "var(--brand)" }}>
              <LocalTime date={meeting.startTime} options={{ month: "short" }} />
            </span>
            <span className="text-lg font-black leading-none">
              <LocalTime date={meeting.startTime} options={{ day: "numeric" }} />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{meeting.title}</h3>
              {isPending && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Action Needed</span>
              )}
            </div>
            <p className="text-xs font-medium flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <LocalTime date={meeting.startTime} options={{ hour: "numeric", minute: "2-digit" }} /> - <LocalTime date={meeting.endTime} options={{ hour: "numeric", minute: "2-digit" }} />
            </p>
          </div>
        </button>
        
        <div className="flex items-center gap-4 shrink-0">
          {meeting.ticketId && (
            <Link 
              href={`/tickets/${meeting.ticketId}`}
              className="text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-black/5"
              style={{ color: "var(--brand)", background: "var(--brand-subtle)" }}
            >
              Ticket #{meeting.ticketId.slice(-6).toUpperCase()}
            </Link>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1">
            <svg 
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              style={{ color: "var(--text-muted)" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {expanded && (
        <div className="p-4 border-t flex flex-col gap-4" style={{ borderColor: "var(--border)", background: "var(--surface-0)" }}>
          {meeting.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Description</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{meeting.description}</p>
            </div>
          )}

          <div className="flex gap-8">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Host</p>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {(meeting.createdBy.name || meeting.createdBy.email || "H")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate min-w-0" style={{ color: "var(--text-primary)" }} title={meeting.createdBy.name || meeting.createdBy.email || undefined}>
                  {meeting.createdBy.name || meeting.createdBy.email}
                </span>
                {amIHost && <span className="text-sm font-medium shrink-0" style={{ color: "var(--text-primary)" }}> (You)</span>}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Attendees</p>
              <div className="flex flex-col gap-2">
                {meeting.attendees.map(a => (
                  <div key={a.id} className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                      {(a.user.name || a.user.email || "A")[0].toUpperCase()}
                    </div>
                    <span className="text-sm truncate min-w-0" style={{ color: "var(--text-secondary)" }} title={a.user.name || a.user.email || undefined}>
                      {a.user.name || a.user.email}
                    </span>
                    {a.userId === session?.user?.id && <span className="text-sm shrink-0" style={{ color: "var(--text-secondary)" }}> (You)</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                      a.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-600' :
                      a.status === 'DECLINED' ? 'bg-rose-500/10 text-rose-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-2">
              {isPending && (
                <>
                  <button onClick={() => handleRSVP("ACCEPTED")} disabled={isUpdating} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 bg-emerald-500">
                    Accept
                  </button>
                  <button onClick={() => handleRSVP("DECLINED")} disabled={isUpdating} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 bg-rose-500">
                    Decline
                  </button>
                </>
              )}
              {amIHost && !isPastEnd && (
                <button onClick={handleCancel} disabled={isDeleting} className="px-4 py-2 rounded-lg text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 border border-rose-200">
                  Cancel Meeting
                </button>
              )}
            </div>

            {!isPastEnd && (
              myAttendeeRecord?.status === "DECLINED" ? (
                <div className="px-6 py-2 rounded-lg text-sm font-bold bg-rose-500/10 text-rose-600">
                  You Declined
                </div>
              ) : myAttendeeRecord?.status === "CANCELLED" ? (
                <div className="px-6 py-2 rounded-lg text-sm font-bold bg-gray-500/10 text-gray-500">
                  Meeting Cancelled
                </div>
              ) : isWithin15Mins ? (
                <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-lg shadow-indigo-500/25" style={{ background: "var(--brand)" }}>
                  Join Meeting Now
                </a>
              ) : (
                <button disabled className="px-6 py-2 rounded-lg text-sm font-bold cursor-not-allowed" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  Room opens 15m before start
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar View Container
// ---------------------------------------------------------------------------

export function DashboardCalendar() {
  const { data, isLoading, error } = useGetMeetingsQuery();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || now === null) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-24 rounded-xl" style={{ background: "var(--surface-1)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center rounded-xl border border-rose-200 bg-rose-50">
        <p className="text-rose-600 font-semibold">Failed to load schedule.</p>
      </div>
    );
  }

  const meetings = data?.data || [];
  
  const upcoming = meetings.filter(m => new Date(m.endTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  const past = meetings.filter(m => new Date(m.endTime).getTime() <= now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Upcoming Meetings</h2>
        {upcoming.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Your schedule is clear</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>You have no upcoming meetings.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {upcoming.map(m => <ScheduleItem key={m.id} meeting={m} now={now} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Past Meetings</h2>
          <div className="flex flex-col gap-4">
            {past.slice(0, 5).map(m => <ScheduleItem key={m.id} meeting={m} now={now} />)}
          </div>
        </div>
      )}
    </div>
  );
}
