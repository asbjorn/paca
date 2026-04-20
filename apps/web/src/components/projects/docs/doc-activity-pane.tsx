import {
	type ActivityEntry,
	ActivityPane,
} from "@/components/shared/activity-pane";
import {
	addDocComment,
	type DocActivity,
	deleteDocComment,
	docQueryKeys,
	getCommentText,
	listActivities,
	updateDocComment,
} from "@/lib/doc-api";

type DocActivityChange = {
	field: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getDocActivityChanges(content: unknown): DocActivityChange[] {
	if (!isRecord(content)) {
		return [];
	}

	const { changes } = content;
	if (!Array.isArray(changes)) {
		return [];
	}

	return changes.filter(
		(change): change is DocActivityChange =>
			isRecord(change) && typeof change.field === "string",
	);
}

function describeDocActivity(entry: ActivityEntry): string {
	const activity = entry as DocActivity;
	switch (activity.activity_type) {
		case "doc.created":
			return "created this document";
		case "doc.updated": {
			const changes = getDocActivityChanges(activity.content);
			if (changes.length > 0) {
				const fields = changes.map((c) => c.field).join(", ");
				return `updated ${fields}`;
			}
			return "updated the document";
		}
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
