"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation } from "@/store/projectsApi";
import type { Project } from "@/types";

type ProjectWithDomains = Project & {
  domains: { id: string; domain: string }[];
};

function EditProjectModal({ project, isOpen, onClose }: { project: ProjectWithDomains; isOpen: boolean; onClose: () => void }) {
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [name, setName] = useState(project.name);
  const [domainsInput, setDomainsInput] = useState(project.domains?.map((d) => d.domain).join(", ") || "");
  const [contractStart, setContractStart] = useState(project.contractStart ? new Date(project.contractStart).toISOString().split("T")[0] : "");
  const [contractEnd, setContractEnd] = useState(project.contractEnd ? new Date(project.contractEnd).toISOString().split("T")[0] : "");
  const [expirationSubject, setExpirationSubject] = useState(project.expirationSubject || "");
  const [expirationBody, setExpirationBody] = useState(project.expirationBody || "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const domains = domainsInput
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (contractStart && contractEnd && new Date(contractEnd) <= new Date(contractStart)) {
      setMessage({ type: "error", text: "Contract End Date must be after Start Date." });
      return;
    }

    try {
      await updateProject({
        id: project.id,
        body: {
          name,
          domains,
          contractStart: contractStart || null,
          contractEnd: contractEnd || null,
          expirationSubject: expirationSubject || null,
          expirationBody: expirationBody || null,
        }
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const errorMessage = (err as { data?: { error?: string } })?.data?.error || "Failed to update project.";
      setMessage({ type: "error", text: errorMessage });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface-0)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Edit Project
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {message && (
          <div
            className="mb-4 px-3 py-2.5 rounded-lg text-sm font-medium break-words"
            style={
              message.type === "success"
                ? { background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }
                : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
            }
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="edit-project-name" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Project Name *
              </label>
              <input
                id="edit-project-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                placeholder="Acme Corp"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="edit-project-domains" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Associated Domains
              </label>
              <input
                id="edit-project-domains"
                type="text"
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
                className="input-base"
                placeholder="acme.com, acme.co.uk"
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Comma separated</p>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="edit-contract-start" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Contract Start Date
              </label>
              <input
                id="edit-contract-start"
                type="date"
                value={contractStart}
                onChange={(e) => setContractStart(e.target.value)}
                className="input-base"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="edit-contract-end" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Contract End Date
              </label>
              <input
                id="edit-contract-end"
                type="date"
                value={contractEnd}
                onChange={(e) => setContractEnd(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Expiration Email Templates (Optional)
            </label>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Variables: <code className="bg-black/10 dark:bg-white/10 px-1 rounded">{'{project.name}'}</code>, <code className="bg-black/10 dark:bg-white/10 px-1 rounded">{'{email.subject}'}</code>
            </p>

            <input
              type="text"
              value={expirationSubject}
              onChange={(e) => setExpirationSubject(e.target.value)}
              className="input-base mb-2"
              placeholder="Subject: [Notice] Support SLA Expired for {project.name}"
            />
            <textarea
              value={expirationBody}
              onChange={(e) => setExpirationBody(e.target.value)}
              className="input-base min-h-[80px]"
              placeholder="Body: Your technical support contract for {project.name} has ended..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  const { data: session, status } = useSession();

  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const [name, setName] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [expirationSubject, setExpirationSubject] = useState("");
  const [expirationBody, setExpirationBody] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingProject, setEditingProject] = useState<ProjectWithDomains | null>(null);

  if (status === "loading") {
    return (
      <div className="p-8 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return (
      <div
        className="m-8 p-4 rounded-xl text-sm font-medium"
        style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        Unauthorized. You must be an Admin to access this page.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const domains = domainsInput
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (contractStart && contractEnd && new Date(contractEnd) <= new Date(contractStart)) {
      setMessage({ type: "error", text: "Contract End Date must be after Start Date." });
      return;
    }

    try {
      await createProject({
        name,
        domains,
        contractStart: contractStart || null,
        contractEnd: contractEnd || null,
        expirationSubject: expirationSubject || null,
        expirationBody: expirationBody || null,
      }).unwrap();

      setMessage({ type: "success", text: "Project created successfully!" });
      setName("");
      setDomainsInput("");
      setContractStart("");
      setContractEnd("");
      setExpirationSubject("");
      setExpirationBody("");
    } catch (err: unknown) {
      const errorMessage = (err as { data?: { error?: string } })?.data?.error || "Failed to create project.";
      setMessage({ type: "error", text: errorMessage });
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          Project Management
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your support projects, domain routing, and SLA contracts.
        </p>
      </div>

      {/* Create Form */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
        }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Create New Project
        </h3>

        {message && (
          <div
            className="mb-4 px-3 py-2.5 rounded-lg text-sm font-medium break-words"
            style={
              message.type === "success"
                ? { background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }
                : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
            }
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="project-name" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Project Name *
              </label>
              <input
                id="project-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                placeholder="Acme Corp"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="project-domains" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Associated Domains
              </label>
              <input
                id="project-domains"
                type="text"
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
                className="input-base"
                placeholder="acme.com, acme.co.uk"
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Comma separated</p>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="contract-start" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Contract Start Date
              </label>
              <input
                id="contract-start"
                type="date"
                value={contractStart}
                onChange={(e) => setContractStart(e.target.value)}
                className="input-base"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="contract-end" className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
                Contract End Date
              </label>
              <input
                id="contract-end"
                type="date"
                value={contractEnd}
                onChange={(e) => setContractEnd(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Expiration Email Templates (Optional)
            </label>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Variables: <code className="bg-black/10 dark:bg-white/10 px-1 rounded">{'{project.name}'}</code>, <code className="bg-black/10 dark:bg-white/10 px-1 rounded">{'{email.subject}'}</code>
            </p>

            <input
              type="text"
              value={expirationSubject}
              onChange={(e) => setExpirationSubject(e.target.value)}
              className="input-base mb-2"
              placeholder="Subject: [Notice] Support SLA Expired for {project.name}"
            />
            <textarea
              value={expirationBody}
              onChange={(e) => setExpirationBody(e.target.value)}
              className="input-base min-h-[80px]"
              placeholder="Body: Your technical support contract for {project.name} has ended..."
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="mt-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 self-start px-6"
            style={{ background: "var(--brand)" }}
          >
            {isCreating ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>

      {/* Project List */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Existing Projects
        </h3>
        
        {isLoadingProjects ? (
          <div className="p-8 flex items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading projects...
          </div>
        ) : !projectsData?.data || projectsData.data.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No projects found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsData.data.map((project: ProjectWithDomains) => (
              <div
                key={project.id}
                className="p-4 rounded-xl flex flex-col gap-2 relative group"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm block truncate w-full pr-8" title={project.name} style={{ color: "var(--text-primary)" }}>{project.name}</span>
                  
                  <button 
                    onClick={() => setEditingProject(project)}
                    className="absolute top-4 right-4 p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                    style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                    title="Edit Project"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                    </svg>
                  </button>
                </div>
                
                {project.domains && project.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.domains.map((d: { id: string; domain: string }) => (
                      <span
                        key={d.id}
                        className="text-[10px] px-2 py-0.5 rounded-full break-all"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        {d.domain}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <div className="min-w-0">
                    <span className="uppercase text-[9px] tracking-wider block mb-0.5 opacity-70 truncate">Start Date</span>
                    {project.contractStart ? new Date(project.contractStart).toLocaleDateString() : "—"}
                  </div>
                  <div className="min-w-0">
                    <span className="uppercase text-[9px] tracking-wider block mb-0.5 opacity-70 truncate">End Date</span>
                    {project.contractEnd ? new Date(project.contractEnd).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingProject && (
        <EditProjectModal 
          key={editingProject.id}
          project={editingProject} 
          isOpen={true} 
          onClose={() => setEditingProject(null)} 
        />
      )}
    </div>
  );
}
