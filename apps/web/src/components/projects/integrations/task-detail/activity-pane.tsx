import {
	Bold,
	Hash,
	Italic,
	List,
	MessageSquare,
	Paperclip,
	Send,
	Smile,
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ActivityItem } from "./activity-item";
import type { ActivityEntry } from "./types";

interface ActivityPaneProps {
	activities: ActivityEntry[];
}

export function ActivityPane({ activities }: ActivityPaneProps) {
	const [comment, setComment] = useState("");
	const [commentFocused, setCommentFocused] = useState(false);

	const handleSend = () => {
		const text = comment.trim();
		if (!text) return;
		setComment("");
		setCommentFocused(false);
	};

	return (
		<div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border/40">
			{/* Header */}
			<div className="flex shrink-0 items-center gap-2.5 border-b border-border/40 px-5 py-3">
				<MessageSquare className="size-4 text-muted-foreground" />
				<span className="text-sm font-semibold text-muted-foreground">
					Activity
				</span>
				{activities.length > 0 && (
					<span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
						{activities.length}
					</span>
				)}
			</div>

			{/* Activity feed */}
			<ScrollArea className="flex-1 px-4 py-4">
				<div className="space-y-4">
					{activities.map((entry) => (
						<ActivityItem key={entry.id} entry={entry} />
					))}
					{activities.length === 0 && (
						<p className="text-center text-sm text-muted-foreground/40 italic py-6">
							No activity yet
						</p>
					)}
				</div>
			</ScrollArea>

			{/* Comment input */}
			<div className="shrink-0 border-t border-border/40 p-4 space-y-2">
				{/* Formatting toolbar (shown when focused) */}
				{commentFocused && (
					<div className="flex items-center gap-0.5 rounded-t-xl border border-b-0 border-border/50 bg-muted/30 px-2.5 py-1.5">
						{[
							{ icon: Bold, title: "Bold" },
							{ icon: Italic, title: "Italic" },
							{ icon: List, title: "List" },
						].map(({ icon: Icon, title }) => (
							<button
								key={title}
								type="button"
								title={title}
								className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
							>
								<Icon className="size-3.5" />
							</button>
						))}
						<div className="mx-1.5 h-4 w-px bg-border/50" />
						{[
							{ icon: Smile, title: "Emoji" },
							{ icon: Paperclip, title: "Attach" },
							{ icon: Hash, title: "Mention" },
						].map(({ icon: Icon, title }) => (
							<button
								key={title}
								type="button"
								title={title}
								className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
							>
								<Icon className="size-3.5" />
							</button>
						))}
					</div>
				)}

				{/* Textarea + send */}
				<div
					className={cn(
						"flex items-end gap-2 rounded-xl border border-border/50 bg-card px-3.5 py-2.5 transition-all",
						commentFocused && "rounded-tl-none border-border/70 shadow-xs",
					)}
				>
					<textarea
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						onFocus={() => setCommentFocused(true)}
						onBlur={() => !comment && setCommentFocused(false)}
						placeholder="Write a comment…"
						rows={commentFocused ? 3 : 1}
						className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 leading-relaxed"
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								handleSend();
							}
						}}
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={!comment.trim()}
						className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors"
					>
						<Send className="size-3.5" />
					</button>
				</div>
				<p className="text-xs text-muted-foreground/30 text-right">
					⌘↵ to send
				</p>
			</div>
		</div>
	);
}
