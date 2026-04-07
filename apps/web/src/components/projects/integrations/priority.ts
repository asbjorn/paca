export interface PriorityMeta {
	label: string;
	color: string;
}

export const PRIORITY_LABELS: Record<number, PriorityMeta> = {
	0: { label: "None", color: "oklch(var(--muted-foreground))" },
	1: { label: "Low", color: "#60a5fa" },
	2: { label: "Medium", color: "#f59e0b" },
	3: { label: "High", color: "#f97316" },
	4: { label: "Critical", color: "#ef4444" },
};

export function getPriority(importance: number): PriorityMeta {
	return PRIORITY_LABELS[Math.min(importance, 4)] ?? PRIORITY_LABELS[0];
}
