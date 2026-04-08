import { Check } from "lucide-react";
import { useState } from "react";
import type { Task } from "@/lib/integration-api";
import type { TaskStatus } from "@/lib/project-api";
import { cn } from "@/lib/utils";

interface SubtaskRowProps {
	task: Task;
	statuses: TaskStatus[];
}

export function SubtaskRow({ task, statuses }: SubtaskRowProps) {
	const status = statuses.find((s) => s.id === task.status_id);
	const [done, setDone] = useState(false);
	return (
		<div className="group/sub flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors">
			<button
				type="button"
				onClick={() => setDone(!done)}
				className={cn(
					"flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
					done
						? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
						: "border-border/60 text-transparent hover:border-border",
				)}
			>
				<Check className="size-3" />
			</button>
			<span
				className={cn(
					"flex-1 text-sm truncate",
					done && "line-through text-muted-foreground/50",
				)}
			>
				{task.title}
			</span>
			{status && (
				<span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/40 px-2 py-0.5 text-xs text-muted-foreground">
					<span
						className="size-2 rounded-full"
						style={{ background: status.color ?? "currentColor" }}
					/>
					{status.name}
				</span>
			)}
		</div>
	);
}
