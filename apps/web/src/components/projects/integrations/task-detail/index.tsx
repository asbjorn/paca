import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getPriority } from "../priority";
import { ActivityPane } from "./activity-pane";
import { AttachmentsSection } from "./attachments-section";
import { ChecklistsSection } from "./checklists-section";
import { DescriptionSection } from "./description-section";
import { PropertiesPanel } from "./properties-panel";
import { SubtasksSection } from "./subtasks-section";
// Sub-components
import { TaskHeader } from "./task-header";
// Types
import type { ActivityEntry, TaskDetailModalProps } from "./types";

// Re-exports for consumers
export type {
	ActivityEntry,
	Attachment,
	Checklist,
	ChecklistItem,
	CustomFieldDef,
	TaskDetailModalProps,
} from "./types";

export function TaskDetailModal({
	task,
	open,
	onOpenChange,
	statuses,
	taskTypes,
	members = [],
	customFields = [],
	projectName,
	integrationName,
	projectId,
	mode = "modal",
	canEdit = true,
}: TaskDetailModalProps) {
	const status = statuses.find((s) => s.id === task?.status_id);
	const taskType = taskTypes.find((t) => t.id === task?.task_type_id);
	const priority = getPriority(task?.importance ?? 0);
	const assignee = members.find((m) => m.user_id === task?.assignee_id);
	const reporter = members.find((m) => m.user_id === task?.reporter_id);

	// Placeholder — will come from API
	const subtasks = [] as Parameters<typeof SubtasksSection>[0]["subtasks"];

	// Mock activity entries
	const activities: ActivityEntry[] = task
		? [
				{
					id: "1",
					type: "created",
					author: reporter?.full_name || reporter?.username || "System",
					content: "created this task",
					timestamp: task.created_at,
				},
				...(task.assignee_id
					? [
							{
								id: "2",
								type: "assignee_change" as const,
								author: reporter?.full_name || reporter?.username || "System",
								content: `assigned this to ${assignee?.full_name || assignee?.username || "a member"}`,
								timestamp: task.updated_at,
							},
						]
					: []),
			]
		: [];

	// Close on Escape (modal mode only)
	useEffect(() => {
		if (!open || mode === "page") return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, mode, onOpenChange]);

	if (mode === "modal" && !open) return null;

	// ── Content ────────────────────────────────────────────────────────────────
	const content = task ? (
		<div className="flex h-full overflow-hidden">
			{/* ── Left: Content pane ── */}
			<div className="flex flex-1 min-w-0 flex-col overflow-hidden">
				{/* Header bar */}
				<TaskHeader
					task={task}
					mode={mode}
					projectName={projectName}
					integrationName={integrationName}
					projectId={projectId}
					onClose={() => onOpenChange(false)}
				/>

				{/* Scrollable content */}
				<ScrollArea className="flex-1">
					<div className="p-6 space-y-8 max-w-3xl mx-auto">
						{/* Type badge + Status chip + Title */}
						<div className="space-y-4">
							<div className="flex items-center gap-2.5 flex-wrap">
								{taskType && (
									<span
										className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold leading-tight border"
										style={{
											borderColor: taskType.color
												? `${taskType.color}44`
												: "var(--border)",
											backgroundColor: taskType.color
												? `${taskType.color}18`
												: "var(--muted)",
											color: taskType.color ?? "inherit",
										}}
									>
										{taskType.icon && (
											<span className="mr-1">{taskType.icon}</span>
										)}
										{taskType.name}
									</span>
								)}
								{status && (
									<span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
										<span
											className="size-2 rounded-full shrink-0"
											style={{
												background: status.color ?? "var(--muted-foreground)",
											}}
										/>
										{status.name}
									</span>
								)}
							</div>

							<h1
								className="font-[Syne] text-2xl font-bold leading-snug text-foreground"
								data-testid="task-title"
							>
								{task.title}
							</h1>
						</div>

						{/* Properties */}
						<div>
							<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
								Properties
							</h3>
							<PropertiesPanel
								task={task}
								status={status}
								taskType={taskType}
								priority={priority}
								assignee={assignee}
								reporter={reporter}
								initialCustomFields={customFields}
								canEdit={canEdit}
							/>
						</div>

						{/* Description */}
						<DescriptionSection description={task.description} />

						{/* Subtasks */}
						<SubtasksSection subtasks={subtasks} statuses={statuses} />

						{/* Checklists */}
						<ChecklistsSection />

						{/* Attachments */}
						<AttachmentsSection canEdit={canEdit} />

						{/* Bottom breathing room */}
						<div className="h-6" />
					</div>
				</ScrollArea>
			</div>

			{/* ── Right: Activity pane ── */}
			<ActivityPane activities={activities} />
		</div>
	) : (
		<div className="flex h-full items-center justify-center">
			<div className="flex flex-col items-center gap-4 text-muted-foreground/50">
				<AlertCircle className="size-10" />
				<div className="text-center">
					<p className="text-base font-medium">Task not found</p>
					<p className="text-sm mt-1">
						This task may have been deleted or the link is invalid.
					</p>
				</div>
			</div>
		</div>
	);

	// ── Modal wrapper ──────────────────────────────────────────────────────────
	if (mode === "page") {
		return (
			<div className="flex h-full flex-col overflow-hidden bg-background">
				{content}
			</div>
		);
	}

	return (
		<>
			{/* Backdrop */}
			<div
				className={cn(
					"fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity duration-150",
					open ? "opacity-100" : "opacity-0 pointer-events-none",
				)}
				onClick={() => onOpenChange(false)}
				aria-hidden="true"
			/>

			{/* Modal panel */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label={task?.title ?? "Task detail"}
				className={cn(
					"fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
					"flex h-[90vh] w-[92vw] max-w-6xl flex-col overflow-hidden",
					"rounded-2xl border border-border/60 bg-popover shadow-2xl",
					"transition-all duration-150 origin-center",
					open
						? "opacity-100 scale-100"
						: "opacity-0 scale-95 pointer-events-none",
				)}
			>
				{content}
			</div>
		</>
	);
}
