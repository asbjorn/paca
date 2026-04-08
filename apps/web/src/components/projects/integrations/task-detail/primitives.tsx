// Shared UI primitives used across task-detail sub-components

export function FieldRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[9rem_1fr] items-start gap-3 py-2.5 group/field">
			<span className="text-sm text-muted-foreground pt-0.5 leading-snug">
				{label}
			</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export function FieldValue({
	children,
	empty,
}: {
	children?: React.ReactNode;
	empty?: boolean;
}) {
	if (empty) {
		return (
			<span className="text-sm text-muted-foreground/40 italic">Empty</span>
		);
	}
	return <span className="text-sm text-foreground">{children}</span>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
			{children}
		</h3>
	);
}
