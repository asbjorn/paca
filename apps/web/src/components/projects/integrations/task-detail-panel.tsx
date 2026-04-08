import { Calendar, Flag, GitBranch, User } from "lucide-react";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { Task } from "@/lib/integration-api";
import type { TaskStatus, TaskType } from "@/lib/project-api";

import { PRIORITY_LABELS } from "./priority";

interface TaskDetailPanelProps {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	statuses: TaskStatus[];
	taskTypes: TaskType[];
}

export function TaskDetailPanel({
	task,
	open,
	onOpenChange,
	statuses,
	taskTypes,
}: TaskDetailPanelProps) {
	const status = statuses.find((s) => s.id === task?.status_id);
	const taskType = taskTypes.find((t) => t.id === task?.task_type_id);
	const priority = PRIORITY_LABELS[task?.importance ?? 0] ?? PRIORITY_LABELS[0];

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="sm:max-w-md overflow-y-auto gap-0 p-0"
			>
				{task && (
					<>
						<SheetHeader className="border-b border-border/50 p-5 pb-4 gap-2">
							{/* Type + Status badges */}
							<div className="flex items-center gap-2 flex-wrap">
								{taskType && (
									<span
										className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
										style={{
											backgroundColor: taskType.color
												? `${taskType.color}22`
												: "oklch(var(--muted))",
											color: taskType.color ?? "inherit",
										}}
									>
										{taskType.name}
									</span>
								)}
								{status && (
									<span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
										<span
											className="size-1.5 rounded-full shrink-0"
											style={{
												background:
													status.color ?? "oklch(var(--muted-foreground))",
											}}
										/>
										{status.name}
									</span>
								)}
							</div>
							<SheetTitle className="text-base font-semibold leading-snug pr-6">
								{task.title}
							</SheetTitle>
						</SheetHeader>

						<div className="p-5 flex flex-col gap-5">
							{/* Properties */}
							<div className="flex flex-col gap-3">
								{/* Priority */}
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1.5 w-28 shrink-0 text-xs text-muted-foreground">
										<Flag className="size-3.5" />
										Priority
									</div>
									<span
										className="inline-flex items-center gap-1 text-xs font-medium"
										style={{ color: priority.color }}
									>
										<span
											className="size-2 rounded-full"
											style={{ background: priority.color }}
										/>
										{priority.label}
									</span>
								</div>

								{/* Assignee */}
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1.5 w-28 shrink-0 text-xs text-muted-foreground">
										<User className="size-3.5" />
										Assignee
									</div>
									{task.assignee_id ? (
										<div className="flex items-center gap-1.5">
											<div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold ring-1 ring-border/50">
												<User className="size-3" />
											</div>
											<span className="text-xs text-muted-foreground">
												Assigned
											</span>
										</div>
									) : (
										<span className="text-xs text-muted-foreground/50">
											Unassigned
										</span>
									)}
								</div>

								{/* Sprint */}
								{task.sprint_id && (
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-1.5 w-28 shrink-0 text-xs text-muted-foreground">
											<GitBranch className="size-3.5" />
											Sprint
										</div>
										<span className="text-xs text-muted-foreground font-mono truncate">
											{task.sprint_id}
										</span>
									</div>
								)}

								{/* Created */}
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1.5 w-28 shrink-0 text-xs text-muted-foreground">
										<Calendar className="size-3.5" />
										Created
									</div>
									<span className="text-xs text-muted-foreground">
										{new Date(task.created_at).toLocaleDateString(undefined, {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</span>
								</div>

								{/* Updated */}
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1.5 w-28 shrink-0 text-xs text-muted-foreground">
										<Calendar className="size-3.5" />
										Updated
									</div>
									<span className="text-xs text-muted-foreground">
										{new Date(task.updated_at).toLocaleDateString(undefined, {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</span>
								</div>
							</div>

							{/* Description */}
							{task.description && (
								<div className="flex flex-col gap-1.5 border-t border-border/40 pt-4">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Description
									</p>
									<p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
										{task.description}
									</p>
								</div>
							)}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
