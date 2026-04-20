import {
	addDocComment,
	deleteDocComment,
	type DocActivity,
	docQueryKeys,
	getCommentText,
	listActivities,
	updateDocComment,
} from "@/lib/doc-api";
import {
	ActivityPane,
	type ActivityEntry,
} from "@/components/shared/activity-pane";

function describeDocActivity(entry: ActivityEntry): string {
	const activity = entry as DocActivity;
	switch (activity.activity_type) {
		case "doc.created":
			return "created this document";
		case "doc.updated":
			if (activity.changes && activity.changes.length > 0) {
				const fields = activity.changes.map((c) => c.field).join(", ");
				return `updated ${fields}`;
			}
			return "updated the document";
		case "doc.deleted":
			return "deleted the document";
		case "doc.moved":
			return "moved the document";
		default:
			return getCommentText(activity.content) || activity.activity_type;
	}
}

interface DocActivityPaneProps {
	projectId: string;
	docId: string;
	currentUserId?: string;
}

export function DocActivityPane({
	projectId,
	docId,
	currentUserId,
}: DocActivityPaneProps) {
	const queryKey = docQueryKeys.activities(projectId, docId);

	return (
		<ActivityPane<DocActivity>
			projectId={projectId}
			entityId={docId}
			queryKey={queryKey}
			queryFn={() => listActivities(projectId, docId)}
			addComment={(text) => addDocComment(projectId, docId, text)}
			updateComment={(commentId, text) =>
				updateDocComment(projectId, docId, commentId, text)
			}
			deleteComment={(commentId) =>
				deleteDocComment(projectId, docId, commentId)
			}
			describeActivity={describeDocActivity}
			getCommentText={getCommentText}
			currentUserId={currentUserId}
			sortAscending
		/>
	);
}
