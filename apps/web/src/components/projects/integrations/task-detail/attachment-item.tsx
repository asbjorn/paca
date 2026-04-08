import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "./helpers";
import type { Attachment } from "./types";

interface AttachmentItemProps {
	attachment: Attachment;
	canDelete?: boolean;
	onDelete?: (id: string) => void;
}

export function AttachmentItem({
	attachment,
	canDelete,
	onDelete,
}: AttachmentItemProps) {
	const ext = attachment.name.split(".").pop()?.toUpperCase() ?? "FILE";
	return (
		<div className="group/att flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<span className="text-[11px] font-bold tracking-tight">{ext}</span>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-foreground truncate">
					{attachment.name}
				</p>
				<p className="text-xs text-muted-foreground/50 mt-0.5">
					{timeAgo(attachment.uploaded_at)}
				</p>
			</div>
			{canDelete && (
				<button
					type="button"
					onClick={() => onDelete?.(attachment.id)}
					className={cn(
						"shrink-0 size-7 flex items-center justify-center rounded-lg",
						"text-muted-foreground opacity-0 group-hover/att:opacity-100",
						"hover:text-destructive hover:bg-destructive/10 transition-all",
					)}
					aria-label={`Delete ${attachment.name}`}
				>
					<Trash2 className="size-4" />
				</button>
			)}
		</div>
	);
}
