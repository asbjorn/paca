import { cn } from "@/lib/utils";
import { timeAgo } from "./helpers";
import type { ActivityEntry } from "./types";

export function ActivityItem({ entry }: { entry: ActivityEntry }) {
	const isComment = entry.type === "comment";
	return (
		<div className="flex gap-3">
			<div
				className={cn(
					"flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5",
					isComment
						? "bg-primary/15 text-primary"
						: "bg-muted text-muted-foreground",
				)}
			>
				{entry.author.slice(0, 1).toUpperCase()}
			</div>
			<div className="flex-1 min-w-0">
				{isComment ? (
					<div className="rounded-xl rounded-tl-sm border border-border/60 bg-card px-4 py-3 shadow-xs">
						<div className="mb-1.5 flex items-center gap-2">
							<span className="text-sm font-semibold text-foreground/80">
								{entry.author}
							</span>
							<span className="text-xs text-muted-foreground/50">
								{timeAgo(entry.timestamp)}
							</span>
						</div>
						<p className="text-sm text-foreground/80 leading-relaxed">
							{entry.content}
						</p>
					</div>
				) : (
					<div className="flex flex-wrap items-baseline gap-1.5 py-1">
						<span className="text-sm font-medium text-foreground/80">
							{entry.author}
						</span>
						<span className="text-sm text-muted-foreground">
							{entry.content}
						</span>
						<span className="text-xs text-muted-foreground/40">
							{timeAgo(entry.timestamp)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
