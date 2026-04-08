import {
	ArrowRight,
	CalendarDays,
	Clock,
	GitBranch,
	Link2,
	Minus,
	Plus,
	Tag,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Task } from "@/lib/integration-api";
import type { ProjectMember, TaskStatus, TaskType } from "@/lib/project-api";
import type { PriorityMeta } from "../priority";
import { AddFieldDialog } from "./add-field-dialog";
import { FieldRow, FieldValue } from "./primitives";
import type { CustomFieldDef } from "./types";

interface PropertiesPanelProps {
	task: Task;
	status: TaskStatus | undefined;
	taskType: TaskType | undefined;
	priority: PriorityMeta;
	assignee: ProjectMember | undefined;
	reporter: ProjectMember | undefined;
	initialCustomFields?: CustomFieldDef[];
	canEdit?: boolean;
}

export function PropertiesPanel({
	task,
	status,
	priority,
	assignee,
	reporter,
	initialCustomFields = [],
	canEdit = true,
}: PropertiesPanelProps) {
	const [localCustomFields, setLocalCustomFields] =
		useState<CustomFieldDef[]>(initialCustomFields);
	const [addFieldOpen, setAddFieldOpen] = useState(false);

	useEffect(() => {
		setLocalCustomFields(initialCustomFields);
	}, [initialCustomFields]);

	return (
		<>
			<div className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card px-4 py-1">
				{/* Status */}
				<FieldRow label="Status">
					{status ? (
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-sm font-medium text-muted-foreground hover:border-border transition-colors"
						>
							<span
								className="size-2 rounded-full shrink-0"
								style={{
									background: status.color ?? "var(--muted-foreground)",
								}}
							/>
							{status.name}
						</button>
					) : (
						<FieldValue empty />
					)}
				</FieldRow>

				{/* Dates */}
				<FieldRow label="Dates">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border/70 hover:bg-muted/60 transition-colors"
						>
							<CalendarDays className="size-3.5 shrink-0" />
							Start date
						</button>
						<Minus className="size-3 text-border/60 shrink-0" />
						<button
							type="button"
							className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border/70 hover:bg-muted/60 transition-colors"
						>
							<CalendarDays className="size-3.5 shrink-0" />
							Due date
						</button>
					</div>
				</FieldRow>

				{/* Track Time */}
				<FieldRow label="Track Time">
					<button
						type="button"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<Clock className="size-3.5" />
						Add time
					</button>
				</FieldRow>

				{/* Relationships */}
				<FieldRow label="Relationships">
					<button
						type="button"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<Link2 className="size-3.5" />
						<FieldValue empty />
					</button>
				</FieldRow>

				{/* Assignees */}
				<FieldRow label="Assignees">
					{assignee ? (
						<div className="flex items-center gap-2">
							<div className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold ring-1 ring-border/40">
								{(assignee.full_name || assignee.username)
									.slice(0, 1)
									.toUpperCase()}
							</div>
							<span className="text-sm text-foreground/80">
								{assignee.full_name || assignee.username}
							</span>
						</div>
					) : (
						<button
							type="button"
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/40 italic hover:not-italic hover:text-muted-foreground transition-colors"
						>
							<User className="size-3.5 not-italic" />
							Empty
						</button>
					)}
				</FieldRow>

				{/* Importance */}
				<FieldRow label="Importance">
					<button
						type="button"
						className="inline-flex items-center gap-2 text-sm font-medium"
						style={{ color: priority.color }}
					>
						<span
							className="inline-block size-2.5 rounded-full shrink-0"
							style={{ background: priority.color }}
						/>
						{priority.label}
					</button>
				</FieldRow>

				{/* Tags */}
				<FieldRow label="Tags">
					<button
						type="button"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/40 italic hover:not-italic hover:text-muted-foreground transition-colors"
					>
						<Tag className="size-3.5 not-italic" />
						Empty
					</button>
				</FieldRow>

				{/* Reporter (conditional) */}
				{reporter && (
					<FieldRow label="Reporter">
						<div className="flex items-center gap-2">
							<div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold ring-1 ring-border/40">
								{(reporter.full_name || reporter.username)
									.slice(0, 1)
									.toUpperCase()}
							</div>
							<span className="text-sm text-foreground/80">
								{reporter.full_name || reporter.username}
							</span>
						</div>
					</FieldRow>
				)}

				{/* Sprint (conditional) */}
				{task.sprint_id && (
					<FieldRow label="Sprint">
						<div className="flex items-center gap-2">
							<GitBranch className="size-3.5 text-muted-foreground shrink-0" />
							<span className="text-sm font-mono text-foreground/80 truncate">
								{task.sprint_id}
							</span>
						</div>
					</FieldRow>
				)}

				{/* Parent task (conditional) */}
				{task.parent_task_id && (
					<FieldRow label="Parent task">
						<button
							type="button"
							className="flex items-center gap-1.5 text-sm text-primary hover:underline"
						>
							<ArrowRight className="size-3.5 shrink-0" />
							<span className="truncate">{task.parent_task_id}</span>
						</button>
					</FieldRow>
				)}

				{/* Custom fields (inline with built-ins) */}
				{localCustomFields.map((cf) => {
					const rawVal = task.custom_fields?.[cf.field_key];
					const hasVal = rawVal != null && rawVal !== "";
					return (
						<FieldRow key={cf.id} label={cf.display_name}>
							{hasVal ? (
								<FieldValue>{String(rawVal)}</FieldValue>
							) : (
								<FieldValue empty />
							)}
						</FieldRow>
					);
				})}
			</div>

			{/* Add fields */}
			{canEdit && (
				<button
					type="button"
					onClick={() => setAddFieldOpen(true)}
					className="mt-3 flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
				>
					<Plus className="size-3.5" />
					Add fields
				</button>
			)}

			<AddFieldDialog
				open={addFieldOpen}
				onOpenChange={setAddFieldOpen}
				onAdd={(field) => setLocalCustomFields((prev) => [...prev, field])}
			/>
		</>
	);
}
