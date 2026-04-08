import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KanbanSquare, List, MoreHorizontal, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	createBacklogView,
	createView,
	deleteBacklogView,
	deleteView,
	updateBacklogView,
	updateView,
	backlogViewsQueryOptions,
	createTask,
	layoutToViewType,
	viewsQueryOptions,
	type IntegrationView,
	type Task,
	type ViewLayout,
} from "@/lib/integration-api";
import {
	projectMembersQueryOptions,
	taskStatusesQueryOptions,
	taskTypesQueryOptions,
} from "@/lib/project-api";
import { cn } from "@/lib/utils";

import { BoardView } from "./board-view";
import { ListView } from "./list-view";
import { TaskDetailPanel } from "./task-detail-panel";

interface IntegrationLayoutProps {
	projectId: string;
	integrationKey: string;
	title: string;
	description?: string | null;
	tasksQueryKey: unknown[];
	tasks: Task[];
	tasksLoading: boolean;
	canCreate: boolean;
	canEdit: boolean;
	canManageViews: boolean;
	onTaskClick?: (task: Task) => void;
	sprintId?: string | null;
}

// ── New View Popover ───────────────────────────────────────────────────────────
function NewViewPopover({
	onSubmit,
	isPending,
}: {
	onSubmit: (name: string, layout: ViewLayout) => Promise<unknown>;
	isPending?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [layout, setLayout] = useState<ViewLayout>("Board");

	const submit = async () => {
		await onSubmit(name || `New ${layout}`, layout);
		setName("");
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<button
						type="button"
						className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
					/>
				}
			>
				<Plus className="size-3.5" />
				<span className="hidden sm:inline">New view</span>
			</PopoverTrigger>
			<PopoverContent side="bottom" align="end" className="w-60 p-0 gap-0" sideOffset={6}>
				<div className="p-3 border-b border-border/50">
					<p className="text-xs font-semibold">New view</p>
				</div>
				<div className="p-3 flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-muted-foreground">View name</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && submit()}
							placeholder={`New ${layout}`}
							className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-muted-foreground">Layout</label>
						<div className="flex gap-2">
							{(["Board", "List"] as ViewLayout[]).map((l) => (
								<button
									key={l}
									type="button"
									onClick={() => setLayout(l)}
									className={cn(
										"flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-xs font-medium transition-colors",
										layout === l
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:text-foreground",
									)}
								>
									{l === "Board" ? <KanbanSquare className="size-3.5" /> : <List className="size-3.5" />}
									{l}
								</button>
							))}
						</div>
					</div>
					<button
						type="button"
						onClick={submit}
						disabled={isPending}
						className="w-full rounded-md bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
					>
						{isPending ? "Creating…" : "Create view"}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ── Rename Dialog ──────────────────────────────────────────────────────────────
function RenameViewDialog({
	view,
	open,
	onOpenChange,
	onSubmit,
	isPending,
}: {
	view: IntegrationView | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (viewId: string, name: string) => Promise<unknown>;
	isPending?: boolean;
}) {
	const [name, setName] = useState(view?.name ?? "");

	useEffect(() => {
		if (view) setName(view.name);
	}, [view]);

	const submit = async () => {
		if (!view || !name.trim()) return;
		await onSubmit(view.id, name.trim());
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xs">
				<DialogHeader>
					<DialogTitle>Rename view</DialogTitle>
				</DialogHeader>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
				/>
				<DialogFooter>
					<DialogClose
						render={<Button variant="outline" size="sm" />}
					>
						Cancel
					</DialogClose>
					<Button size="sm" disabled={!name.trim() || isPending} onClick={submit}>
						{isPending ? "Renaming…" : "Rename"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export function IntegrationLayout({
	projectId,
	integrationKey,
	title,
	description,
	tasksQueryKey,
	tasks,
	tasksLoading,
	canCreate,
	canEdit,
	canManageViews,
	onTaskClick,
	sprintId,
}: IntegrationLayoutProps) {
	const qc = useQueryClient();

	const { data: statuses = [] } = useQuery(taskStatusesQueryOptions(projectId));
	const { data: taskTypes = [] } = useQuery(taskTypesQueryOptions(projectId));

	// Load views from the API (backlog or sprint)
	const viewsQuery = useQuery(
		sprintId
			? viewsQueryOptions(projectId, sprintId)
			: backlogViewsQueryOptions(projectId),
	);

	const FALLBACK_VIEWS: IntegrationView[] = [
		{ id: "__default-board__", name: "Board", view_type: "board", layout: "Board" },
		{ id: "__default-list__", name: "List", view_type: "table", layout: "List" },
	];
	const serverViews = viewsQuery.data ?? [];
	const views = serverViews.length > 0 ? serverViews : (viewsQuery.isSuccess ? FALLBACK_VIEWS : []);

	const viewsQueryKey = sprintId
		? viewsQueryOptions(projectId, sprintId).queryKey
		: backlogViewsQueryOptions(projectId).queryKey;

	// Active view: prefer last-selected (stored in localStorage), fall back to first
	const [preferredViewId, setPreferredViewId] = useState<string>(() => {
		try {
			return localStorage.getItem(`paca:active-view:${integrationKey}`) ?? "";
		} catch { return ""; }
	});

	const activeView = views.find((v) => v.id === preferredViewId) ?? views[0];
	const activeViewId = activeView?.id ?? "";

	// Persist active view preference
	useEffect(() => {
		if (!activeViewId) return;
		try {
			localStorage.setItem(`paca:active-view:${integrationKey}`, activeViewId);
		} catch { /* ignore */ }
	}, [activeViewId, integrationKey]);

	const [renameTarget, setRenameTarget] = useState<IntegrationView | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const searchRef = useRef<HTMLInputElement>(null);
	const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
	const [filterOpen, setFilterOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);

	const { data: members = [] } = useQuery(projectMembersQueryOptions(projectId));

	const handleTaskClick = (task: Task) => {
		setSelectedTask(task);
		onTaskClick?.(task);
	};

	// ── Task mutation ─────────────────────────────────────────────────────────
	const createTaskMutation = useMutation({
		mutationFn: (payload: { title: string; statusId: string }) =>
			createTask(projectId, {
				title: payload.title,
				status_id: payload.statusId,
				sprint_id: sprintId ?? null,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: tasksQueryKey }),
	});

	const handleCreateTask = async (statusId: string, title: string) => {
		await createTaskMutation.mutateAsync({ title, statusId });
	};

	// ── View mutations ────────────────────────────────────────────────────────
	const createViewMutation = useMutation({
		mutationFn: (payload: { name: string; layout: ViewLayout }) => {
			const view_type = layoutToViewType(payload.layout);
			return sprintId
				? createView(projectId, sprintId, { name: payload.name, view_type })
				: createBacklogView(projectId, { name: payload.name, view_type });
		},
		onSuccess: (view) => {
			qc.invalidateQueries({ queryKey: viewsQueryKey });
			setPreferredViewId(view.id);
		},
	});

	const renameViewMutation = useMutation({
		mutationFn: (payload: { viewId: string; name: string }) =>
			sprintId
				? updateView(projectId, sprintId, payload.viewId, { name: payload.name })
				: updateBacklogView(projectId, payload.viewId, { name: payload.name }),
		onSuccess: () => qc.invalidateQueries({ queryKey: viewsQueryKey }),
	});

	const deleteViewMutation = useMutation({
		mutationFn: (viewId: string) =>
			sprintId
				? deleteView(projectId, sprintId, viewId)
				: deleteBacklogView(projectId, viewId),
		onSuccess: (_, deletedId) => {
			qc.invalidateQueries({ queryKey: viewsQueryKey });
			if (preferredViewId === deletedId) {
				const remaining = views.filter((v) => v.id !== deletedId);
				setPreferredViewId(remaining[0]?.id ?? "");
			}
		},
	});

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Header */}
			<div className="shrink-0 border-b border-border/50 px-6 py-4">
				<h1 className="font-[Syne] text-xl font-bold tracking-tight">{title}</h1>
				{description && (
					<p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
				)}
			</div>

			{/* View tab bar */}
			<div className="flex shrink-0 items-center gap-1 border-b border-border/40 px-4">
				<div className="flex items-end gap-0.5 overflow-x-auto flex-1 min-w-0">
					{views.map((view) => {
						const isActive = view.id === activeView?.id;
						return (
							<div key={view.id} className="relative flex items-center group shrink-0">
								<button
									type="button"
									onClick={() => setPreferredViewId(view.id)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all duration-150 relative",
										isActive
											? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{view.layout === "Board" ? (
										<KanbanSquare className="size-3.5" />
									) : (
										<List className="size-3.5" />
									)}
									{view.name}
								</button>

								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<button
												type="button"
												className={cn(
													"flex size-5 items-center justify-center rounded transition-opacity",
													"opacity-0 group-hover:opacity-100",
													"hover:bg-muted/60 text-muted-foreground hover:text-foreground",
												)}
											/>
										}
									>
										<MoreHorizontal className="size-3" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" sideOffset={4}>
										<DropdownMenuItem
											onSelect={() => {
												setRenameTarget(view);
												setRenameOpen(true);
											}}
										>
											Rename view
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											disabled={views.length <= 1}
											onSelect={() => deleteViewMutation.mutate(view.id)}
											className="text-destructive focus:text-destructive"
										>
											Delete view
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						);
					})}
				</div>

				<div className="flex shrink-0 items-center gap-1 pl-2 border-l border-border/30 ml-1">
					{searchOpen ? (
						<div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
							<Search className="size-3.5 text-muted-foreground shrink-0" />
							<input
								ref={searchRef}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search tasks…"
								autoFocus
								className="w-32 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										setSearchOpen(false);
										setSearchQuery("");
									}
								}}
							/>
							<button
								type="button"
								onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="size-3" />
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setSearchOpen(true)}
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
						>
							<Search className="size-3.5" />
						</button>
					)}

					{/* Assignee filter */}
					<Popover open={filterOpen} onOpenChange={setFilterOpen}>
						<PopoverTrigger
							render={
								<button
									type="button"
									className={cn(
										"flex size-7 items-center justify-center rounded-md transition-colors",
										assigneeFilter
											? "bg-primary/10 text-primary"
											: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
									)}
								/>
							}
						>
							<SlidersHorizontal className="size-3.5" />
						</PopoverTrigger>
						<PopoverContent side="bottom" align="end" className="w-52 p-0" sideOffset={6}>
							<div className="p-2 border-b border-border/50">
								<p className="text-xs font-semibold">Filter by assignee</p>
							</div>
							<div className="flex flex-col py-1 max-h-52 overflow-y-auto">
								<button
									type="button"
									onClick={() => { setAssigneeFilter(null); setFilterOpen(false); }}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/40 transition-colors text-left",
										!assigneeFilter && "text-primary font-medium",
									)}
								>
									All assignees
								</button>
								{members.map((m) => (
									<button
										key={m.user_id}
										type="button"
										onClick={() => { setAssigneeFilter(m.user_id); setFilterOpen(false); }}
										className={cn(
											"flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/40 transition-colors text-left",
											assigneeFilter === m.user_id && "text-primary font-medium",
										)}
									>
										<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold">
											{(m.full_name || m.username).slice(0, 1).toUpperCase()}
										</div>
										<span className="truncate">{m.full_name || m.username}</span>
									</button>
								))}
								{members.length === 0 && (
									<p className="px-3 py-2 text-xs text-muted-foreground/50">No members</p>
								)}
							</div>
							{assigneeFilter && (
								<div className="border-t border-border/50 p-2">
									<button
										type="button"
										onClick={() => { setAssigneeFilter(null); setFilterOpen(false); }}
										className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
									>
										<X className="size-3" />
										Clear filter
									</button>
								</div>
							)}
						</PopoverContent>
					</Popover>

					{canManageViews && (
						<NewViewPopover
							onSubmit={(name, layout) => createViewMutation.mutateAsync({ name, layout })}
							isPending={createViewMutation.isPending}
						/>
					)}
				</div>
			</div>

			{/* View content */}
			<div className="flex-1 overflow-hidden">
				{tasksLoading ? (
					<div className="flex h-full items-center justify-center">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				) : activeView?.layout === "Board" ? (
					<BoardView
						projectId={projectId}
						tasks={tasks}
						statuses={statuses}
						taskTypes={taskTypes}
						canCreate={canCreate}
						canEdit={canEdit}
						searchQuery={searchQuery}
						assigneeFilter={assigneeFilter}
						tasksQueryKey={tasksQueryKey}
						onCreateTask={handleCreateTask}
						onTaskClick={handleTaskClick}
					/>
				) : (
					<ListView
						tasks={tasks}
						statuses={statuses}
						taskTypes={taskTypes}
						canCreate={canCreate}
						searchQuery={searchQuery}
						assigneeFilter={assigneeFilter}
						onCreateTask={handleCreateTask}
						onTaskClick={handleTaskClick}
					/>
				)}
			</div>

			{/* Rename dialog (state-controlled) */}
			<RenameViewDialog
				view={renameTarget}
				open={renameOpen}
				onOpenChange={(v) => { setRenameOpen(v); if (!v) setRenameTarget(null); }}
				onSubmit={(viewId, name) => renameViewMutation.mutateAsync({ viewId, name })}
				isPending={renameViewMutation.isPending}
			/>

			{/* Task detail panel */}
			<TaskDetailPanel
				task={selectedTask}
				open={!!selectedTask}
				onOpenChange={(v) => { if (!v) setSelectedTask(null); }}
				statuses={statuses}
				taskTypes={taskTypes}
			/>
		</div>
	);
}
