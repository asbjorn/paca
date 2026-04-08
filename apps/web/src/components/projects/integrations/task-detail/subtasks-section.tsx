import { Plus } from "lucide-react";
import type { Task } from "@/lib/integration-api";
import type { TaskStatus } from "@/lib/project-api";
import { SubtaskRow } from "./subtask-row";

interface SubtasksSectionProps {
	subtasks: Task[];
	statuses: TaskStatus[];
}

export function SubtasksSection({ subtasks, statuses }: SubtasksSectionProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
					Subtasks
				</span>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold transition-colors"
				>
					<Plus className="size-3.5" />
					Add Task
				</button>
			</div>

			{subtasks.length > 0 ? (
				<div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30 overflow-hidden">
					{subtasks.map((sub) => (
						<SubtaskRow key={sub.id} task={sub} statuses={statuses} />
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground/40 italic px-1">
					No subtasks yet — click "Add Task" to create one.
				</p>
			)}
		</div>
	);
}
