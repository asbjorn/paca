import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { IntegrationLayout } from "@/components/projects/integrations/integration-layout";
import { usePermissions } from "@/hooks/use-permissions";
import {
	sprintQueryOptions,
	sprintTasksQueryOptions,
} from "@/lib/integration-api";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/integrations/sprints/$sprintId",
)({
	loader: async ({
		context: { queryClient },
		params: { projectId, sprintId },
	}) => {
		await queryClient
			.ensureQueryData(sprintQueryOptions(projectId, sprintId))
			.catch(() => {
				throw redirect({
					to: "/projects/$projectId/integrations/backlog",
					params: { projectId },
				});
			});
	},
	component: SprintPage,
});

function SprintPage() {
	const { projectId, sprintId } = Route.useParams();
	const { hasPermission } = usePermissions();

	const { data: sprint, isError } = useQuery(
		sprintQueryOptions(projectId, sprintId),
	);
	const tasksQuery = useQuery(sprintTasksQueryOptions(projectId, sprintId));

	const canCreate = hasPermission("tasks.write");
	const canEdit = hasPermission("tasks.write");
	const canManageViews = hasPermission("projects.write");

	if (isError || !sprint) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
				<AlertCircle className="size-8 opacity-40" />
				<p className="text-sm">Sprint not found or access denied.</p>
			</div>
		);
	}

	const statusBadge =
		sprint.status === "active"
			? "Active"
			: sprint.status === "planned"
				? "Planned"
				: "Completed";

	return (
		<IntegrationLayout
			projectId={projectId}
			integrationKey={`sprint:${sprintId}`}
			title={sprint.name}
			description={
				sprint.goal
					? sprint.goal
					: `${statusBadge} sprint${sprint.start_date ? ` · started ${new Date(sprint.start_date).toLocaleDateString()}` : ""}`
			}
			tasksQueryKey={sprintTasksQueryOptions(projectId, sprintId).queryKey}
			tasks={tasksQuery.data?.items ?? []}
			tasksLoading={tasksQuery.isLoading}
			canCreate={canCreate}
			canEdit={canEdit}
			canManageViews={canManageViews}
			sprintId={sprintId}
		/>
	);
}
