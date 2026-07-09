"use client";

import { useState, useMemo } from "react";
import { useCreateMeetingMutation } from "@/store/meetingsApi";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: string;
  defaultTitle?: string;
  defaultAttendeeIds?: string[];
  onSuccess: () => void;
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  ticketId,
  defaultTitle = "",
  defaultAttendeeIds = [],
  onSuccess,
}: ScheduleMeetingModalProps) {
  const [createMeeting, { isLoading }] = useCreateMeetingMutation();

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  
  // Date and Time strings
  const [date, setDate] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("09:30");

  const [errorMsg, setErrorMsg] = useState("");
  const [conflictMsg, setConflictMsg] = useState("");

  // Derive ISO strings from date + time
  const { startTime, endTime, isTimeValid } = useMemo(() => {
    if (!date) return { startTime: "", endTime: "", isTimeValid: false };
    
    // Construct local Date objects, then convert to UTC ISO string for API
    const start = new Date(`${date}T${startTimeStr}:00`);
    const end = new Date(`${date}T${endTimeStr}:00`);
    
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isTimeValid: end > start,
    };
  }, [date, startTimeStr, endTimeStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setConflictMsg("");

    if (!isTimeValid) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    try {
      await createMeeting({
        title,
        description,
        startTime,
        endTime,
        ticketId,
        attendeeIds: defaultAttendeeIds,
        meetingUrl: "", // Populated by backend
        createdById: "", // Populated by backend
      }).unwrap();

      onSuccess();
      onClose();
    } catch (err) {
      const error = err as { status?: number; data?: { error?: string } };
      // 409 Conflict intercept
      if (error.status === 409) {
        setConflictMsg(error.data?.error || "A scheduling conflict occurred.");
      } else {
        setErrorMsg(error.data?.error || "Failed to schedule meeting.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl" 
        style={{ background: "var(--surface-0)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Schedule Meeting
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {conflictMsg && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-medium">
            <div className="flex items-start gap-2">
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{conflictMsg}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
              Title
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base w-full"
              placeholder="e.g. Follow-up sync"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
              Date
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base w-full"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                Start Time
              </label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="input-base w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                End Time
              </label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
              Description & Agenda (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-base w-full resize-none"
              placeholder="Enter meeting details..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ color: "var(--text-secondary)", background: "var(--surface-1)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !date}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {isLoading ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
