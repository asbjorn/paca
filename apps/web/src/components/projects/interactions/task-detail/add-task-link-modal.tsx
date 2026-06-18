import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Search, X } from "lucide-react";
import {
	type LinkType,
	listAllTasks,
	type Task,
} from "@/lib/interaction-api";

interface AddTaskLinkModalProps {
	open: boolean;
	onClose: () => void;
	onAdd: (targetTaskId: string, linkType: LinkType) => void;
	projectId: string;
	currentTaskId: string;
	taskIdPrefix?: string;
}

const LINK_TYPE_OPTIONS: { value: LinkType; label: string; description: string }[] = [
	{ value: "blocks", label: "Blocks", description: "This task must be completed before the other" },
	{ value: "is_blocked_by" as LinkType, label: "Is blocked by", description: "This task cannot start until the other is done" },
	{ value: "relates_to", label: "Relates to", description: "These tasks are related but not dependent" },
	{ value: "duplicates", label: "Duplicates", description: "This task is a duplicate of the other" },
];

// Maps display types back to the canonical storage type and direction
const DISPLAY_TO_CANONICAL: Record<string, { linkType: LinkType; swap: boolean }> = {
	blocks: { linkType: "blocks", swap: false },
	is_blocked_by: { linkType: "blocks", swap: true },
	relates_to: { linkType: "relates_to", swap: false },
	duplicates: { linkType: "duplicates", swap: false },
};

export function AddTaskLinkModal({
	open,
	onClose,
	onAdd,
	projectId,
	currentTaskId,
	taskIdPrefix = "",
}: AddTaskLinkModalProps) {
	const [selectedLinkType, setSelectedLinkType] = useState<string>("blocks");
	const [query, setQuery] = useState("");
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(false);
	const searchRef = useRef<HTMLInputElement>(null);

	// Load tasks once when modal opens
	useEffect(() => {
		if (!open) return;
		setLoading(true);
		listAllTasks(projectId, { pageSize: 200 })
			.then((result) => setTasks(result.items))
			.finally(() => setLoading(false));
		setTimeout(() => searchRef.current?.focus(), 50);
	}, [open, projectId]);

	const filteredTasks = useMemo(() => {
		const q = query.trim().toLowerCase();
		return tasks.filter((t) => {
			if (t.id === currentTaskId) return false;
			if (!q) return true;
			const prefix = taskIdPrefix ? `${taskIdPrefix}-${t.task_number}` : String(t.task_number);
			return (
				t.title.toLowerCase().includes(q) ||
				prefix.toLowerCase().includes(q)
			);
		});
	}, [tasks, query, currentTaskId, taskIdPrefix]);

	function handleSelect(task: Task) {
		const canonical = DISPLAY_TO_CANONICAL[selectedLinkType];
		if (!canonical) return;
		if (canonical.swap) {
			// "is blocked by" means target blocks source — we store it as target→source
			// but the API takes (source=currentTask, target=otherTask, type=blocks).
			// For "is_blocked_by", we flip: the other task IS the source.
			// We handle this by calling onAdd with the other task as source using a
			// reversed direction: CreateTaskLink(source=target, target=current).
			// Since our API creates source→target, for "is_blocked_by" we need to
			// create a link where target_task_id = currentTaskId and source = this task.
			// We pass a special signal via a negative swap — the parent will call the
			// API as: CreateTaskLink(source=task.id, target=currentTaskId, type="blocks").
			onAdd(`__swap__${task.id}`, canonical.linkType);
		} else {
			onAdd(task.id, canonical.linkType);
		}
	}

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
					<div className="flex items-center gap-2.5">
						<div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
							<Link2 className="size-3.5 text-primary" />
						</div>
						<h2 className="text-[14px] font-semibold text-foreground">Link task</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="size-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-all duration-150"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Link type selector */}
				<div className="px-5 pt-4 pb-3">
					<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-2">
						Relationship
					</p>
					<div className="grid grid-cols-2 gap-1.5">
						{LINK_TYPE_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => setSelectedLinkType(opt.value)}
								className={`px-3 py-2 rounded-lg text-left text-[12px] font-medium transition-all duration-150 border ${
									selectedLinkType === opt.value
										? "bg-primary/10 border-primary/30 text-primary"
										: "bg-muted/20 border-border/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
								}`}
								title={opt.description}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Search */}
				<div className="px-5 pb-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
						<input
							ref={searchRef}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search tasks by title or number..."
							className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border/30 bg-muted/20 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-150"
						/>
					</div>
				</div>

				{/* Task list */}
				<div className="mx-5 mb-5 rounded-xl border border-border/20 overflow-hidden max-h-64 overflow-y-auto [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40">
					{loading && (
						<div className="flex items-center justify-center py-8 text-muted-foreground/50 text-[13px]">
							Loading tasks…
						</div>
					)}
					{!loading && filteredTasks.length === 0 && (
						<div className="flex items-center justify-center py-8 text-muted-foreground/45 text-[13px] italic">
							No tasks found
						</div>
					)}
					{!loading &&
						filteredTasks.map((task) => {
							const prefix = taskIdPrefix
								? `${taskIdPrefix}-${task.task_number}`
								: `#${task.task_number}`;
							return (
								<button
									key={task.id}
									type="button"
									onClick={() => handleSelect(task)}
									className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors duration-100 border-b border-border/10 last:border-0"
								>
									<span className="shrink-0 text-[11px] font-mono text-muted-foreground/60 min-w-13">
										{prefix}
									</span>
									<span className="text-[13px] text-foreground truncate">
										{task.title}
									</span>
								</button>
							);
						})}
				</div>
			</div>
		</div>
	);
}
