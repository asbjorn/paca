import { useQuery } from "@tanstack/react-query";
import { GripVertical, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { IntegrationView, ViewConfig } from "@/lib/integration-api";
import {
	customFieldsQueryOptions,
	type CustomFieldDefinition,
} from "@/lib/project-api";
import { cn } from "@/lib/utils";

import {
	DEFAULT_VISIBLE_FIELDS,
	buildAllFieldOptions,
	buildColumnByOptions,
	buildFieldSumOptions,
	buildSliceByOptions,
	buildSortByOptions,
	buildSwimlaneOptions,
} from "./view-utils";

// ── Shared sub-components ────────────────────────────────────────────────────

function SettingRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 py-2">
			<span className="text-[12px] font-medium text-muted-foreground shrink-0 w-20">
				{label}
			</span>
			{children}
		</div>
	);
}

function DynamicSelect({
	value,
	options,
	onChange,
	placeholder,
}: {
	value: string | undefined;
	options: { key: string; label: string }[];
	onChange: (v: string | undefined) => void;
	placeholder?: string;
}) {
	return (
		<select
			value={value ?? ""}
			onChange={(e) =>
				onChange(e.target.value === "" ? undefined : e.target.value)
			}
			className="flex-1 rounded-lg border border-border/30 bg-muted/25 px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 min-w-0"
		>
			{placeholder !== undefined && <option value="">{placeholder}</option>}
			{options.map((o) => (
				<option key={o.key} value={o.key}>
					{o.label}
				</option>
			))}
		</select>
	);
}

// ── Field picker ──────────────────────────────────────────────────────────────

interface FieldPickerProps {
	visibleFields: string[];
	customFields: CustomFieldDefinition[];
	onChange: (fields: string[]) => void;
}

function FieldPicker({ visibleFields, customFields, onChange }: FieldPickerProps) {
	const allFields = buildAllFieldOptions(customFields);
	const dragRef = useRef<string | null>(null);

	const toggle = (key: string) => {
		if (visibleFields.includes(key)) {
			onChange(visibleFields.filter((f) => f !== key));
		} else {
			onChange([...visibleFields, key]);
		}
	};

	const handleDragStart = (key: string) => {
		dragRef.current = key;
	};

	const handleDrop = (targetKey: string) => {
		const src = dragRef.current;
		if (!src || src === targetKey) return;
		const next = [...visibleFields];
		const si = next.indexOf(src);
		const ti = next.indexOf(targetKey);
		if (si !== -1 && ti !== -1) {
			next.splice(si, 1);
			next.splice(ti, 0, src);
			onChange(next);
		}
		dragRef.current = null;
	};

	const enabled = visibleFields
		.map((k) => allFields.find((f) => f.key === k))
		.filter((f): f is { key: string; label: string } => Boolean(f));
	const disabled = allFields.filter((f) => !visibleFields.includes(f.key));

	return (
		<div className="flex flex-col gap-0.5 py-1 max-h-60 overflow-y-auto">
			{enabled.map((f) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: drag-to-reorder row
				<div
					key={f.key}
					draggable
					onDragStart={() => handleDragStart(f.key)}
					onDragOver={(e) => e.preventDefault()}
					onDrop={() => handleDrop(f.key)}
					className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 cursor-grab active:cursor-grabbing"
				>
					<GripVertical className="size-3 text-muted-foreground/40 shrink-0" />
					<input
						type="checkbox"
						id={`field-${f.key}`}
						checked
						onChange={() => toggle(f.key)}
						className="size-3.5 rounded accent-primary cursor-pointer"
					/>
					<label
						htmlFor={`field-${f.key}`}
						className="text-[12px] font-medium truncate cursor-pointer flex-1"
					>
						{f.label}
					</label>
				</div>
			))}
			{disabled.length > 0 && (
				<div className="mx-2 my-1 border-t border-border/20" />
			)}
			{disabled.map((f) => (
				<div
					key={f.key}
					className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
				>
					<div className="size-3 shrink-0" />
					<input
						type="checkbox"
						id={`field-${f.key}`}
						checked={false}
						onChange={() => toggle(f.key)}
						className="size-3.5 rounded accent-primary cursor-pointer"
					/>
					<label
						htmlFor={`field-${f.key}`}
						className="text-[12px] font-medium text-muted-foreground/70 truncate cursor-pointer flex-1"
					>
						{f.label}
					</label>
				</div>
			))}
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

interface ViewSettingsPanelProps {
	projectId: string;
	view: IntegrationView | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (viewId: string, config: ViewConfig) => Promise<unknown>;
	onPreview: (config: ViewConfig) => void;
	isPending?: boolean;
}

export function ViewSettingsPanel({
	projectId,
	view,
	open,
	onOpenChange,
	onSave,
	onPreview,
	isPending,
}: ViewSettingsPanelProps) {
	const { data: customFields = [] } = useQuery(
		customFieldsQueryOptions(projectId),
	);

	const [draft, setDraft] = useState<ViewConfig>(() => view?.config ?? {});
	const [fieldsOpen, setFieldsOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on view?.id so config is re-read only when the view itself changes
	useEffect(() => {
		if (open) setDraft(view?.config ?? {});
	}, [open, view?.id]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: onPreview is stable; including it causes infinite loops
	useEffect(() => {
		if (open) onPreview(draft);
	}, [draft, open]);

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen && view) {
			onPreview(view.config ?? {});
			setFieldsOpen(false);
		}
		onOpenChange(newOpen);
	};

	const update = (patch: Partial<ViewConfig>) => {
		setDraft((prev) => {
			const next = { ...prev, ...patch };
			for (const key of Object.keys(patch) as (keyof ViewConfig)[]) {
				if (patch[key] === undefined) delete next[key];
			}
			return next;
		});
	};

	const handleSave = async () => {
		if (!view) return;
		await onSave(view.id, draft);
		setFieldsOpen(false);
		onOpenChange(false);
	};

	const handleReset = () => {
		const saved = view?.config ?? {};
		setDraft(saved);
		onPreview(saved);
		setFieldsOpen(false);
	};

	const visibleFields: string[] =
		draft.fields && draft.fields.length > 0
			? draft.fields
			: DEFAULT_VISIBLE_FIELDS;

	const allFieldOpts = buildAllFieldOptions(customFields);
	const fieldsLabel = ["Title", ...visibleFields.map((k) => allFieldOpts.find((f) => f.key === k)?.label ?? k)].join(", ");

	const columnByOpts = buildColumnByOptions(customFields);
	const sortByOpts = buildSortByOptions(customFields);
	const swimlaneOpts = buildSwimlaneOptions(customFields);
	const fieldSumOpts = buildFieldSumOptions(customFields);
	const sliceByOpts = buildSliceByOptions(customFields);

	const sortByValue = draft.sort_by ?? "manual";

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<button
						type="button"
						aria-label="View settings"
						className={cn(
							"flex size-7 items-center justify-center rounded-md transition-all duration-150",
							open
								? "bg-primary/8 text-primary/80"
								: "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60",
						)}
					/>
				}
			>
				<Settings className="size-3.5" />
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="end"
				className="w-80 p-0 gap-0 rounded-xl border border-border/40 shadow-lg"
				sideOffset={6}
			>
				<div className="px-3 py-2.5 border-b border-border/30">
					<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
						View settings
					</p>
				</div>

				{fieldsOpen ? (
					<>
						<div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
							<p className="text-[11px] font-semibold text-muted-foreground/80">
								Choose fields
							</p>
							<button
								type="button"
								onClick={() => setFieldsOpen(false)}
								className="text-[11px] text-primary/80 hover:text-primary font-medium transition-colors"
							>
								← Back
							</button>
						</div>
						<div className="px-1">
							<FieldPicker
								visibleFields={visibleFields}
								customFields={customFields}
								onChange={(fields) => update({ fields })}
							/>
						</div>
					</>
				) : (
					<div className="px-3 py-1 flex flex-col divide-y divide-border/20">
						<SettingRow label="Fields">
							<button
								type="button"
								onClick={() => setFieldsOpen(true)}
								className="flex-1 text-left text-[12px] font-medium text-foreground truncate hover:text-primary transition-colors duration-150"
							>
								{fieldsLabel}
							</button>
						</SettingRow>

						<SettingRow label="Column by">
							<DynamicSelect
								value={draft.column_by ?? "status"}
								options={columnByOpts}
								onChange={(v) => update({ column_by: v })}
							/>
						</SettingRow>

						<SettingRow label="Swimlanes">
							<DynamicSelect
								value={draft.swimlanes ?? "none"}
								options={swimlaneOpts}
								onChange={(v) => update({ swimlanes: v })}
							/>
						</SettingRow>

						<SettingRow label="Sort by">
							<select
								value={sortByValue}
								onChange={(e) => update({ sort_by: e.target.value })}
								className="flex-1 rounded-lg border border-border/30 bg-muted/25 px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 min-w-0"
							>
								{sortByOpts.map((o) => (
									<option key={o.key} value={o.key}>
										{o.label}
									</option>
								))}
							</select>
						</SettingRow>

						<SettingRow label="Field sum">
							<DynamicSelect
								value={draft.field_sum ?? "count"}
								options={fieldSumOpts}
								onChange={(v) => update({ field_sum: v })}
							/>
						</SettingRow>

						<SettingRow label="Slice by">
							<DynamicSelect
								value={draft.slice_by ?? "none"}
								options={sliceByOpts}
								onChange={(v) => update({ slice_by: v })}
							/>
						</SettingRow>
					</div>
				)}

				<div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border/30">
					<button
						type="button"
						onClick={handleReset}
						className="flex items-center gap-1.5 rounded-lg bg-muted/40 text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isPending}
						className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-40 transition-all duration-150"
					>
						{isPending ? "Saving…" : "Save"}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
