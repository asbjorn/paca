import { Plus } from "lucide-react";
import { useState } from "react";
import { ChecklistSection } from "./checklist-section";
import type { Checklist } from "./types";

export function ChecklistsSection() {
	const [checklists, setChecklists] = useState<Checklist[]>([]);

	const handleCreate = () => {
		setChecklists((c) => [
			...c,
			{
				id: crypto.randomUUID(),
				title: `Checklist ${c.length + 1}`,
				items: [],
			},
		]);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
					Checklists
				</span>
				<button
					type="button"
					onClick={handleCreate}
					className="flex items-center gap-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
				>
					<Plus className="size-3.5" />
					Create checklist
				</button>
			</div>

			{checklists.length > 0 ? (
				<div className="space-y-4">
					{checklists.map((cl) => (
						<div
							key={cl.id}
							className="rounded-xl border border-border/40 bg-card p-4"
						>
							<ChecklistSection
								checklist={cl}
								onUpdate={(updated) =>
									setChecklists((all) =>
										all.map((c) => (c.id === updated.id ? updated : c)),
									)
								}
							/>
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground/40 italic px-1">
					No checklists — click "Create checklist" to add one.
				</p>
			)}
		</div>
	);
}
