import { Check, ChevronRight, Hash, Share2, X } from "lucide-react";
import { useState } from "react";
import type { Task } from "@/lib/integration-api";
import { cn } from "@/lib/utils";
import { formatDate, shortId } from "./helpers";

interface TaskHeaderProps {
	task: Task;
	mode: "modal" | "page";
	projectName?: string;
	integrationName?: string;
	projectId?: string;
	onClose: () => void;
}

export function TaskHeader({
	task,
	mode,
	projectName,
	integrationName,
	projectId,
	onClose,
}: TaskHeaderProps) {
	const [linkCopied, setLinkCopied] = useState(false);

	const handleShare = () => {
		// Always share the canonical task detail page URL, not modal URLs with query params
		const taskUrl = projectId
			? `${window.location.origin}/projects/${projectId}/tasks/${task.id}`
			: window.location.href;
		navigator.clipboard?.writeText(taskUrl).catch(() => {});
		setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
	};

	return (
		<div className="flex shrink-0 items-center gap-3 border-b border-border/40 px-5 py-3">
			{/* Breadcrumb (page mode only) */}
			{mode === "page" && projectName && (
				<nav className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
					<span>{projectName}</span>
					<ChevronRight className="size-3.5" />
					{integrationName && (
						<>
							<span>{integrationName}</span>
							<ChevronRight className="size-3.5" />
						</>
					)}
					<span className="text-foreground/70 truncate max-w-36">
						{task.title}
					</span>
				</nav>
			)}

			{/* Task short ID */}
			<div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 border border-border/40">
				<Hash className="size-3.5 text-muted-foreground/60" />
				<span className="font-[JetBrains_Mono,monospace] text-xs font-medium text-muted-foreground tracking-wider">
					{shortId(task.id)}
				</span>
			</div>

			<span className="text-xs text-muted-foreground/50">
				Created {formatDate(task.created_at)}
			</span>

			<div className="ml-auto flex items-center gap-1">
				<button
					type="button"
					onClick={handleShare}
					className={cn(
						"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
						linkCopied
							? "text-emerald-500"
							: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
					)}
				>
					{linkCopied ? (
						<>
							<Check className="size-3.5 text-emerald-500" />
							Copied!
						</>
					) : (
						<>
							<Share2 className="size-3.5" />
							Share
						</>
					)}
				</button>

				{mode === "modal" && (
					<button
						type="button"
						onClick={onClose}
						className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
						aria-label="Close task detail"
					>
						<X className="size-4" />
					</button>
				)}
			</div>
		</div>
	);
}
