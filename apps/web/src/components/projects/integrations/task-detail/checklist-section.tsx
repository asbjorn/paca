import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Checklist } from "./types";

interface ChecklistSectionProps {
	checklist: Checklist;
	onUpdate: (updated: Checklist) => void;
}

export function ChecklistSection({
	checklist,
	onUpdate,
}: ChecklistSectionProps) {
	const [newItem, setNewItem] = useState("");
	const completed = checklist.items.filter((i) => i.checked).length;
	const pct =
		checklist.items.length > 0
			? Math.round((completed / checklist.items.length) * 100)
			: 0;

	const toggle = (id: string) => {
		onUpdate({
			...checklist,
			items: checklist.items.map((i) =>
				i.id === id ? { ...i, checked: !i.checked } : i,
			),
		});
	};

	const addItem = () => {
		const text = newItem.trim();
		if (!text) return;
		onUpdate({
			...checklist,
			items: [
				...checklist.items,
				{ id: crypto.randomUUID(), text, checked: false },
			],
		});
		setNewItem("");
	};

	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-foreground/90 flex-1">
					{checklist.title}
				</span>
				<span className="text-xs font-semibold text-muted-foreground tabular-nums">
					{pct}%
				</span>
			</div>

			{/* Progress bar */}
			<div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
				<div
					className="h-full rounded-full bg-emerald-500 transition-all duration-300"
					style={{ width: `${pct}%` }}
				/>
			</div>

			{/* Items */}
			<div className="space-y-1">
				{checklist.items.map((item) => (
					<div
						key={item.id}
						className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 group/ci"
					>
						<button
							type="button"
							onClick={() => toggle(item.id)}
							className={cn(
								"flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
								item.checked
									? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
									: "border-border/60 text-transparent hover:border-border",
							)}
						>
							<Check className="size-3" />
						</button>
						<span
							className={cn(
								"flex-1 text-sm",
								item.checked && "line-through text-muted-foreground/50",
							)}
						>
							{item.text}
						</span>
					</div>
				))}

				{/* Add item input */}
				<div className="flex items-center gap-3 px-2">
					<div className="size-5 shrink-0" />
					<input
						value={newItem}
						onChange={(e) => setNewItem(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") addItem();
						}}
						placeholder="Add an item…"
						className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 py-1"
					/>
					{newItem && (
						<button
							type="button"
							onClick={addItem}
							className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
						>
							Add
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
