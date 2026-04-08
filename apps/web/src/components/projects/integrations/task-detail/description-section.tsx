import { Sparkles } from "lucide-react";

interface DescriptionSectionProps {
	description?: string | null;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
					Description
				</span>
				<button
					type="button"
					className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
				>
					<Sparkles className="size-3.5" />
					Write with AI
				</button>
			</div>

			{description ? (
				<div className="rounded-xl border border-border/40 bg-card px-5 py-4 cursor-text hover:border-border/70 transition-colors">
					<p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
						{description}
					</p>
				</div>
			) : (
				<button
					type="button"
					className="w-full rounded-xl border border-dashed border-border/50 bg-card/50 px-5 py-5 text-left text-sm text-muted-foreground/50 hover:border-border/70 hover:bg-card hover:text-muted-foreground/70 transition-colors"
				>
					Add description…
				</button>
			)}
		</div>
	);
}
