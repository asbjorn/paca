import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import type { SuccessEnvelope } from "./api-error";

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface AgentPreset {
	id: string;
	label: string;
	description: string;
	defaultLLMProvider: string;
	defaultLLMModel: string;
	defaultSystemPrompt: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
	{
		id: "software-engineer",
		label: "Software Engineer",
		description:
			"An AI agent focused on implementing features and fixing bugs.",
		defaultLLMProvider: "anthropic",
		defaultLLMModel: "claude-sonnet-4-6",
		defaultSystemPrompt:
			"You are an expert software engineer.\n\nYou can be invoked in two ways. This only affects how you manage task state — the work itself is identical in both cases:\n- **Task assignment or task comment @mention**: read the task before starting and update the task status at the start and end. Reply to the user by adding a comment.\n- **Documentation comment @mention**: skip reading and updating task state. Reply to the user by adding a comment.\n- **Direct chat**: skip reading and updating task state. Reply to the user directly in the conversation.\n\n## Workflow\n\n1. *(Task-driven only)* **Read the task**: Use the Paca MCP tool to fetch the full task details including description, acceptance criteria, and current status.\n2. **Assess readiness**: Determine whether you have enough information to begin implementation.\n   - If anything is unclear (e.g. ambiguous requirements, missing context, architectural decisions), add a comment (task assignment, task comment, or doc comment) or ask directly in the conversation (chat), then wait for a response.\n   - If the task is clear and actionable, proceed.\n3. *(Task-driven only)* **Update status to in-progress**: Use the Paca MCP tool to update the task status to the appropriate in-progress status.\n4. **Implement**: Write clean, maintainable code and follow best practices.\n5. *(Task-driven only)* **Update status to done**: Use the Paca MCP tool to update the task status to the appropriate done/completed status.\n6. **Summarise**: Add a comment (task assignment, task comment, or doc comment) or reply directly in the conversation (chat) summarising what was done, key decisions made, and any follow-up items.",
	},
	{
		id: "code-reviewer",
		label: "Code Reviewer",
		description:
			"An AI agent that reviews code for quality, bugs, and best practices.",
		defaultLLMProvider: "anthropic",
		defaultLLMModel: "claude-sonnet-4-6",
		defaultSystemPrompt:
			"You are a meticulous code reviewer.\n\nYou can be invoked in two ways. This only affects how you manage task state — the review itself is identical in both cases:\n- **Task assignment or task comment @mention**: read the task before starting and update the task status at the start and end. Reply to the user by adding a comment.\n- **Documentation comment @mention**: skip reading and updating task state. Reply to the user by adding a comment.\n- **Direct chat**: skip reading and updating task state. Reply to the user directly in the conversation.\n\n## Workflow\n\n1. *(Task-driven only)* **Read the task**: Use the Paca MCP tool to fetch the full task details including the code or pull request to review and the current status.\n2. **Assess readiness**: Determine whether you have enough context to begin the review.\n   - If the scope is unclear, the target branch/PR is not specified, or you need additional information, add a comment (task assignment, task comment, or doc comment) or ask directly in the conversation (chat), then wait for a response.\n   - If the scope is clear, proceed.\n3. *(Task-driven only)* **Update status to in-progress**: Use the Paca MCP tool to update the task status to the appropriate in-progress status.\n4. **Review**: Examine the code for correctness, security vulnerabilities, performance issues, and adherence to best practices. Provide constructive and actionable feedback.\n5. *(Task-driven only)* **Update status to done**: Use the Paca MCP tool to update the task status to the appropriate done/completed status.\n6. **Summarise**: Add a comment (task assignment, task comment, or doc comment) or reply directly in the conversation (chat) summarising the findings, severity of issues found, and recommended next steps.",
	},
	{
		id: "qa-engineer",
		label: "QA Engineer",
		description: "An AI agent specialized in writing and running tests.",
		defaultLLMProvider: "anthropic",
		defaultLLMModel: "claude-sonnet-4-6",
		defaultSystemPrompt:
			"You are a quality assurance engineer.\n\nYou can be invoked in two ways. This only affects how you manage task state — the testing work itself is identical in both cases:\n- **Task assignment or task comment @mention**: read the task before starting and update the task status at the start and end. Reply to the user by adding a comment.\n- **Documentation comment @mention**: skip reading and updating task state. Reply to the user by adding a comment.\n- **Direct chat**: skip reading and updating task state. Reply to the user directly in the conversation.\n\n## Workflow\n\n1. *(Task-driven only)* **Read the task**: Use the Paca MCP tool to fetch the full task details including the feature or component to test and the current status.\n2. **Assess readiness**: Determine whether you have enough information to begin writing or executing tests.\n   - If requirements are ambiguous, acceptance criteria are missing, or you need clarification, add a comment (task assignment, task comment, or doc comment) or ask directly in the conversation (chat), then wait for a response.\n   - If the task is clear and actionable, proceed.\n3. *(Task-driven only)* **Update status to in-progress**: Use the Paca MCP tool to update the task status to the appropriate in-progress status.\n4. **Test**: Write comprehensive test suites, identify edge cases, create test plans, and ensure software reliability through thorough testing strategies.\n5. *(Task-driven only)* **Update status to done**: Use the Paca MCP tool to update the task status to the appropriate done/completed status.\n6. **Summarise**: Add a comment (task assignment, task comment, or doc comment) or reply directly in the conversation (chat) summarising the tests written or executed, coverage achieved, any bugs discovered, and recommendations for the team.",
	},
	{
		id: "planner",
		label: "Planner",
		description:
			"An AI agent that breaks down goals into tasks and organises sprint work.",
		defaultLLMProvider: "anthropic",
		defaultLLMModel: "claude-sonnet-4-6",
		defaultSystemPrompt:
			"You are an expert project planner.\n\nYou can be invoked in two ways. This only affects how you manage task state — the planning work itself is identical in both cases:\n- **Task assignment or task comment @mention**: read the task before starting and update the task status at the start and end. Reply to the user by adding a comment.\n- **Documentation comment @mention**: skip reading and updating task state. Reply to the user by adding a comment.\n- **Direct chat**: skip reading and updating task state. Reply to the user directly in the conversation.\n\n## Workflow\n\n1. *(Task-driven only)* **Read the task**: Use the Paca MCP tool (`get_task` or `get_task_by_number`) to fetch the full task details including description, goals, and current status.\n2. **Understand the project context**: Use `list_task_types` to see the available task types (e.g. Epic, Story, Bug, Feature) and `list_task_statuses` to understand the workflow statuses configured for the project.\n3. **Assess readiness**: Determine whether you have enough information to begin planning.\n   - If the goal is vague, scope is undefined, or you need input (e.g. priorities, constraints, deadlines), add a comment (task assignment, task comment, or doc comment) or ask directly in the conversation (chat), then wait for a response.\n   - If the goal is clear and actionable, proceed.\n4. *(Task-driven only)* **Update status to in-progress**: Use the Paca MCP tool to update the task status to the appropriate in-progress status.\n5. **Create the plan**: Break down the goal into well-defined tasks using `create_task`. For each task, set an appropriate task type (from `list_task_types`), a clear title, description, and acceptance criteria. Group related tasks under Epics or parent tasks where appropriate.\n6. *(Task-driven only)* **Update status to done**: Use the Paca MCP tool to update the original task status to the appropriate done/completed status.\n7. **Summarise**: Add a comment (task assignment, task comment, or doc comment) or reply directly in the conversation (chat) summarising the plan: number of tasks created, the structure, key assumptions made, and recommended execution order.",
	},
	{
		id: "business-analyst",
		label: "Business Analyst",
		description:
			"An AI agent that writes requirements, user stories, and acceptance criteria.",
		defaultLLMProvider: "anthropic",
		defaultLLMModel: "claude-sonnet-4-6",
		defaultSystemPrompt:
			"You are an expert business analyst.\n\nYou can be invoked in two ways. This only affects how you manage task state — the requirements work itself is identical in both cases:\n- **Task assignment or task comment @mention**: read the task before starting and update the task status at the start and end. Reply to the user by adding a comment.\n- **Documentation comment @mention**: skip reading and updating task state. Reply to the user by adding a comment.\n- **Direct chat**: skip reading and updating task state. Reply to the user directly in the conversation.\n\n## Workflow\n\n1. *(Task-driven only)* **Read the task**: Use the Paca MCP tool (`get_task` or `get_task_by_number`) to fetch the full task details including description, goals, stakeholder notes, and current status.\n2. **Understand the project context**: Use `list_task_types` to see available task types (e.g. Story, Epic, Feature, Feedback) and `list_task_statuses` to understand the configured workflow statuses. Use `list_tasks` to review existing tasks and avoid duplicating requirements.\n3. **Assess readiness**: Determine whether you have enough information to begin requirements analysis.\n   - If stakeholder intent is unclear, business rules are missing, or you need input, add a comment (task assignment, task comment, or doc comment) or ask directly in the conversation (chat), then wait for a response.\n   - If you have enough context, proceed.\n4. *(Task-driven only)* **Update status to in-progress**: Use the Paca MCP tool to update the task status to the appropriate in-progress status.\n5. **Produce the requirements**: Use the Paca MCP tool to:\n   - Write detailed user stories (`create_task` with type Story) following the format \"As a [persona], I want [goal] so that [benefit].\"\n   - Add clear, testable acceptance criteria to each story.\n   - Create Epics (`create_task` with type Epic) to group related stories.\n   - Add comments or update task descriptions with business rules, edge cases, and non-functional requirements.\n6. *(Task-driven only)* **Update status to done**: Use the Paca MCP tool to update the task status to the appropriate done/completed status.\n7. **Summarise**: Add a comment (task assignment, task comment, or doc comment) or reply directly in the conversation (chat) summarising what was produced: stories written, epics created, key decisions, and any open items that still need stakeholder sign-off.",
	},
	{
		id: "custom",
		label: "Custom",
		description: "Start from scratch with your own configuration.",
		defaultLLMProvider: "",
		defaultLLMModel: "",
		defaultSystemPrompt: "",
	},
];
export interface AgentMCPServer {
	id: string;
	agent_id: string;
	server_name: string;
	transport: "stdio" | "sse" | "http";
	command?: string | null;
	args?: string[];
	url?: string | null;
	env?: Record<string, string>;
	is_enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface AgentSkill {
	id: string;
	agent_id: string;
	skill_name: string;
	skill_source: "inline" | "marketplace" | "github_url";
	skill_content?: string | null;
	source_url?: string | null;
	triggers: string[];
	is_enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface Agent {
	id: string;
	project_id: string;
	name: string;
	handle: string;
	avatar_url?: string | null;
	llm_provider: string;
	llm_model: string;
	llm_base_url?: string | null;
	system_prompt: string;
	can_clone_repos: boolean;
	git_committer_name: string;
	git_committer_email: string;
	member_id?: string | null;
	mcp_servers?: AgentMCPServer[];
	skills?: AgentSkill[];
	created_at: string;
	updated_at: string;
}

export type ConversationStatus =
	| "queued"
	| "running"
	| "finished"
	| "failed"
	| "stopped";

export interface AgentConversation {
	id: string;
	agent_id: string;
	project_id: string;
	trigger_type: "task_assigned" | "comment_mention" | "chat_message";
	task_id?: string | null;
	comment_id?: string | null;
	chat_session_id?: string | null;
	triggered_by_member_id: string;
	status: ConversationStatus;
	iteration_count: number;
	error_message?: string | null;
	branch_name?: string | null;
	pr_url?: string | null;
	started_at?: string | null;
	finished_at?: string | null;
	created_at: string;
	updated_at: string;
}

export interface AgentConversationEvent {
	id: string;
	conversation_id: string;
	event_index: number;
	event_type: string;
	event_source: "agent" | "user" | "system";
	payload: Record<string, unknown>;
	created_at: string;
}

export interface AgentChatSession {
	id: string;
	agent_id: string;
	project_id: string;
	member_id: string;
	title?: string | null;
	last_message_at?: string | null;
	created_at: string;
	updated_at: string;
}

// ── Agents ────────────────────────────────────────────────────────────────────

export async function listAgents(projectId: string): Promise<Agent[]> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: Agent[] }>
	>(`/projects/${projectId}/agents`);
	return data.data.items;
}

export async function getAgent(
	projectId: string,
	agentId: string,
): Promise<Agent> {
	const { data } = await apiClient.instance.get<SuccessEnvelope<Agent>>(
		`/projects/${projectId}/agents/${agentId}`,
	);
	return data.data;
}

export async function createAgent(
	projectId: string,
	payload: {
		name: string;
		handle: string;
		llm_provider: string;
		llm_model: string;
		llm_api_key: string;
		llm_base_url?: string | null;
		system_prompt?: string;
		can_clone_repos?: boolean;
		git_committer_name?: string;
		git_committer_email?: string;
		project_role_id: string;
	},
): Promise<Agent> {
	const { data } = await apiClient.instance.post<SuccessEnvelope<Agent>>(
		`/projects/${projectId}/agents`,
		payload,
	);
	return data.data;
}

export async function updateAgent(
	projectId: string,
	agentId: string,
	payload: {
		name?: string;
		handle?: string;
		llm_provider?: string;
		llm_model?: string;
		llm_api_key?: string;
		llm_base_url?: string | null;
		system_prompt?: string;
		can_clone_repos?: boolean;
		git_committer_name?: string;
		git_committer_email?: string;
	},
): Promise<Agent> {
	const { data } = await apiClient.instance.patch<SuccessEnvelope<Agent>>(
		`/projects/${projectId}/agents/${agentId}`,
		payload,
	);
	return data.data;
}

export async function deleteAgent(
	projectId: string,
	agentId: string,
): Promise<void> {
	await apiClient.instance.delete(`/projects/${projectId}/agents/${agentId}`);
}

// ── MCP Servers ───────────────────────────────────────────────────────────────

export async function listMCPServers(
	projectId: string,
	agentId: string,
): Promise<AgentMCPServer[]> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: AgentMCPServer[] }>
	>(`/projects/${projectId}/agents/${agentId}/mcp-servers`);
	return data.data.items;
}

export async function addMCPServer(
	projectId: string,
	agentId: string,
	payload: {
		server_name: string;
		transport: "stdio" | "sse" | "http";
		command?: string | null;
		args?: string[];
		url?: string | null;
		env?: Record<string, string>;
	},
): Promise<AgentMCPServer> {
	const { data } = await apiClient.instance.post<
		SuccessEnvelope<AgentMCPServer>
	>(`/projects/${projectId}/agents/${agentId}/mcp-servers`, payload);
	return data.data;
}

export async function updateMCPServer(
	projectId: string,
	agentId: string,
	serverId: string,
	payload: {
		is_enabled?: boolean;
		command?: string;
		args?: string[];
		url?: string | null;
	},
): Promise<AgentMCPServer> {
	const { data } = await apiClient.instance.patch<
		SuccessEnvelope<AgentMCPServer>
	>(
		`/projects/${projectId}/agents/${agentId}/mcp-servers/${serverId}`,
		payload,
	);
	return data.data;
}

export async function deleteMCPServer(
	projectId: string,
	agentId: string,
	serverId: string,
): Promise<void> {
	await apiClient.instance.delete(
		`/projects/${projectId}/agents/${agentId}/mcp-servers/${serverId}`,
	);
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function listSkills(
	projectId: string,
	agentId: string,
): Promise<AgentSkill[]> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: AgentSkill[] }>
	>(`/projects/${projectId}/agents/${agentId}/skills`);
	return data.data.items;
}

export async function addSkill(
	projectId: string,
	agentId: string,
	payload: {
		skill_name: string;
		skill_source: "inline" | "marketplace" | "github_url";
		skill_content?: string;
		source_url?: string | null;
		triggers?: string[];
	},
): Promise<AgentSkill> {
	const { data } = await apiClient.instance.post<SuccessEnvelope<AgentSkill>>(
		`/projects/${projectId}/agents/${agentId}/skills`,
		payload,
	);
	return data.data;
}

export async function updateSkill(
	projectId: string,
	agentId: string,
	skillId: string,
	payload: {
		is_enabled?: boolean;
		triggers?: string[];
		skill_content?: string;
	},
): Promise<AgentSkill> {
	const { data } = await apiClient.instance.patch<SuccessEnvelope<AgentSkill>>(
		`/projects/${projectId}/agents/${agentId}/skills/${skillId}`,
		payload,
	);
	return data.data;
}

export async function deleteSkill(
	projectId: string,
	agentId: string,
	skillId: string,
): Promise<void> {
	await apiClient.instance.delete(
		`/projects/${projectId}/agents/${agentId}/skills/${skillId}`,
	);
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function listConversations(
	projectId: string,
	agentId?: string,
): Promise<AgentConversation[]> {
	const params = agentId ? { agent_id: agentId } : undefined;
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: AgentConversation[] }>
	>(`/projects/${projectId}/conversations`, { params });
	return data.data.items;
}

export async function getConversation(
	projectId: string,
	conversationId: string,
): Promise<AgentConversation> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<AgentConversation>
	>(`/projects/${projectId}/conversations/${conversationId}`);
	return data.data;
}

export async function listConversationEvents(
	projectId: string,
	conversationId: string,
): Promise<AgentConversationEvent[]> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: AgentConversationEvent[] }>
	>(`/projects/${projectId}/conversations/${conversationId}/events`, {
		params: { limit: 200 },
	});
	return data.data.items;
}

export async function stopConversation(
	projectId: string,
	conversationId: string,
): Promise<AgentConversation> {
	const { data } = await apiClient.instance.post<
		SuccessEnvelope<AgentConversation>
	>(`/projects/${projectId}/conversations/${conversationId}/stop`);
	return data.data;
}

// ── Chat Sessions ─────────────────────────────────────────────────────────────

export async function listChatSessions(
	projectId: string,
	agentId: string,
): Promise<AgentChatSession[]> {
	const { data } = await apiClient.instance.get<
		SuccessEnvelope<{ items: AgentChatSession[] }>
	>(`/projects/${projectId}/agents/${agentId}/chat-sessions`);
	return data.data.items;
}

export interface StartChatSessionResponse {
	session: AgentChatSession;
	conversation: AgentConversation;
}

export async function startChatSession(
	projectId: string,
	agentId: string,
	payload: { message: string; title?: string },
): Promise<StartChatSessionResponse> {
	const { data } = await apiClient.instance.post<
		SuccessEnvelope<StartChatSessionResponse>
	>(`/projects/${projectId}/agents/${agentId}/chat-sessions`, payload);
	return data.data;
}

export async function sendChatMessage(
	projectId: string,
	agentId: string,
	sessionId: string,
	payload: { message: string },
): Promise<AgentConversation> {
	const { data } = await apiClient.instance.post<
		SuccessEnvelope<{ conversation: AgentConversation }>
	>(
		`/projects/${projectId}/agents/${agentId}/chat-sessions/${sessionId}/messages`,
		payload,
	);
	return data.data.conversation;
}

// ── Query Options ─────────────────────────────────────────────────────────────

export const agentsQueryOptions = (projectId: string) =>
	queryOptions({
		queryKey: ["projects", projectId, "agents"],
		queryFn: () => listAgents(projectId),
	});

export const agentQueryOptions = (projectId: string, agentId: string) =>
	queryOptions({
		queryKey: ["projects", projectId, "agents", agentId],
		queryFn: () => getAgent(projectId, agentId),
	});

export const agentMCPServersQueryOptions = (
	projectId: string,
	agentId: string,
) =>
	queryOptions({
		queryKey: ["projects", projectId, "agents", agentId, "mcp-servers"],
		queryFn: () => listMCPServers(projectId, agentId),
	});

export const agentSkillsQueryOptions = (projectId: string, agentId: string) =>
	queryOptions({
		queryKey: ["projects", projectId, "agents", agentId, "skills"],
		queryFn: () => listSkills(projectId, agentId),
	});

export const conversationsQueryOptions = (
	projectId: string,
	agentId?: string,
) =>
	queryOptions({
		queryKey: ["projects", projectId, "conversations", { agentId }],
		queryFn: () => listConversations(projectId, agentId),
		refetchInterval: 10_000,
	});

export const conversationQueryOptions = (
	projectId: string,
	conversationId: string,
) =>
	queryOptions({
		queryKey: ["projects", projectId, "conversations", conversationId],
		queryFn: () => getConversation(projectId, conversationId),
	});

export const conversationEventsQueryOptions = (
	projectId: string,
	conversationId: string,
) =>
	queryOptions({
		queryKey: [
			"projects",
			projectId,
			"conversations",
			conversationId,
			"events",
		],
		queryFn: () => listConversationEvents(projectId, conversationId),
	});

export const chatSessionsQueryOptions = (projectId: string, agentId: string) =>
	queryOptions({
		queryKey: ["projects", projectId, "agents", agentId, "chat-sessions"],
		queryFn: () => listChatSessions(projectId, agentId),
	});

// ── LLM Models ────────────────────────────────────────────────────────────────

export interface LLMModelsResponse {
	[provider: string]: string[];
}

export async function listLLMModels(): Promise<LLMModelsResponse> {
	const { data } =
		await apiClient.instance.get<LLMModelsResponse>("/agents/llm-models");
	return data;
}

export const llmModelsQueryOptions = queryOptions({
	queryKey: ["agents", "llm-models"],
	queryFn: listLLMModels,
	staleTime: 10 * 60 * 1000, // 10 min — provider list rarely changes
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
	queued: "Queued",
	running: "Running",
	finished: "Finished",
	failed: "Failed",
	stopped: "Stopped",
};

export const CONVERSATION_STATUS_COLORS: Record<ConversationStatus, string> = {
	queued: "text-muted-foreground",
	running: "text-blue-500",
	finished: "text-emerald-500",
	failed: "text-destructive",
	stopped: "text-muted-foreground",
};
