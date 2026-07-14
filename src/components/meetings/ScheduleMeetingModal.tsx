"use client";

import { useState, useMemo, useEffect } from "react";
import { useCreateMeetingMutation } from "@/store/meetingsApi";
import { useGetAgentsQuery } from "@/store/usersApi";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: string;
  defaultTitle?: string;
  defaultAttendeeIds?: string[];
  onSuccess: () => void;
}

interface TimeSelectProps {
  hour: string; setHour: (v: string) => void;
  minute: string; setMinute: (v: string) => void;
  period: string; setPeriod: (v: string) => void;
  fieldName: string;
}

function TimeSelect({ hour, setHour, minute, setMinute, period, setPeriod, fieldName }: TimeSelectProps) {
  return (
    <div className="flex gap-2">
      <input
        required
        type="number"
        min="1"
        max="12"
        value={hour}
        onChange={(e) => setHour(e.target.value)}
        className="input-base w-16 text-center [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="12"
        aria-label={`${fieldName} hour`}
      />
      <span className="self-center font-bold" style={{ color: "var(--text-muted)" }}>:</span>
      <input
        required
        type="text"
        pattern="[0-5][0-9]"
        title="00 to 59"
        maxLength={2}
        value={minute}
        onChange={(e) => setMinute(e.target.value)}
        className="input-base w-16 text-center"
        placeholder="00"
        aria-label={`${fieldName} minute`}
      />
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="input-base w-20 px-2"
        aria-label={`${fieldName} period`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
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
  const { data: agentsData } = useGetAgentsQuery(undefined, { skip: !isOpen });
  const agents = useMemo(() => agentsData || [], [agentsData]);

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  
  // Date string
  const [date, setDate] = useState("");
  
  // 3-box Start Time
  const [startHour, setStartHour] = useState("9");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  // 3-box End Time
  const [endHour, setEndHour] = useState("9");
  const [endMinute, setEndMinute] = useState("30");
  const [endPeriod, setEndPeriod] = useState("AM");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeammateIds, setSelectedTeammateIds] = useState<string[]>([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [conflictMsg, setConflictMsg] = useState("");

  const selectedAgents = useMemo(() => {
    return agents.filter(a => selectedTeammateIds.includes(a.id));
  }, [agents, selectedTeammateIds]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return agents.filter(a =>
      !defaultAttendeeIds.includes(a.id) &&
      !selectedTeammateIds.includes(a.id) &&
      ((a.name || "").toLowerCase().includes(query) || (a.email || "").toLowerCase().includes(query))
    );
  }, [agents, defaultAttendeeIds, selectedTeammateIds, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const buildTimeString = (hStr: string, mStr: string, period: string) => {
    let h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setConflictMsg("");

    const parsedStart = buildTimeString(startHour, startMinute, startPeriod);
    const parsedEnd = buildTimeString(endHour, endMinute, endPeriod);

    const start = new Date(`${date}T${parsedStart}:00`);
    const end = new Date(`${date}T${parsedEnd}:00`);

    if (start < new Date()) {
      setErrorMsg("Meeting start time cannot be in the past.");
      return;
    }

    if (end <= start) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    try {
      await createMeeting({
        title,
        description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        ticketId,
        attendeeIds: defaultAttendeeIds,
        teammateIds: selectedTeammateIds,
        meetingUrl: "",
        createdById: "",
      }).unwrap();

      onSuccess();
      onClose();
    } catch (err) {
      const error = err as { status?: number; data?: { error?: string } };
      if (error.status === 409) {
        setConflictMsg(error.data?.error || "A scheduling conflict occurred.");
      } else {
        setErrorMsg(error.data?.error || "Failed to schedule meeting.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
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
              <TimeSelect
                hour={startHour} setHour={setStartHour}
                minute={startMinute} setMinute={setStartMinute}
                period={startPeriod} setPeriod={setStartPeriod}
                fieldName="Start time"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                End Time
              </label>
              <TimeSelect
                hour={endHour} setHour={setEndHour}
                minute={endMinute} setMinute={setEndMinute}
                period={endPeriod} setPeriod={setEndPeriod}
                fieldName="End time"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
              Add Teammates (Optional)
            </label>
            
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-base w-full pr-10"
                  placeholder="Search teammates..."
                />
                {searchQuery && filteredAgents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg shadow-xl border z-10" style={{ background: "var(--surface-0)", borderColor: "var(--border)" }}>
                    {filteredAgents.map(agent => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeammateIds(prev => [...prev, agent.id]);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <div className="font-medium">
                          {agent.name || "Unknown Agent"} <span className="text-xs opacity-70 ml-1">({agent.email})</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedAgents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAgents.map(agent => (
                    <div key={agent.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border" style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      <span>{agent.name} ({agent.email})</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTeammateIds(prev => prev.filter(id => id !== agent.id))}
                        className="hover:text-rose-500 transition-colors ml-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
