// spec: features/projects/bdd-scenarios.feature
// seed: tests/seed.spec.ts

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost';
const USERNAME = process.env.E2E_USERNAME ?? 'admin';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-admin-password';
const TEST_PROJECT_PREFIX = 'E2E_BDD_';
const RUN_ID = Date.now().toString(36).slice(-5).toUpperCase();

// ─── API types ────────────────────────────────────────────────────────────────

interface TaskStatus {
  id: string;
  category: string;
}

interface Task {
  id: string;
  title: string;
}

interface BDDScenario {
  id: string;
  title: string;
  given: string;
  when: string;
  then: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function authRequest(request: APIRequestContext): Promise<void> {
  await request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { username: USERNAME, password: PASSWORD, rememberMe: false },
  });
}

async function cleanupTestProjects(request: APIRequestContext): Promise<void> {
  await authRequest(request);
  let page = 1;
  while (true) {
    const resp = await request.get(`${BASE_URL}/api/v1/projects?page=${page}&page_size=100`);
    if (!resp.ok()) break;
    const body = await resp.json();
    const items: Array<{ id: string; name: string }> = body?.data?.items ?? [];
    if (items.length === 0) break;
    await Promise.all(
      items
        .filter((p) => p.name.startsWith(TEST_PROJECT_PREFIX))
        .map((p) => request.delete(`${BASE_URL}/api/v1/projects/${p.id}`)),
    );
    const { page: cur, page_size, total } = body.data;
    if (cur * page_size >= total) break;
    page++;
  }
}

async function createProject(request: APIRequestContext, name: string): Promise<string> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects`, { data: { name } });
  return (await resp.json()).data.id as string;
}

async function getTaskStatuses(request: APIRequestContext, projectId: string): Promise<TaskStatus[]> {
  const resp = await request.get(`${BASE_URL}/api/v1/projects/${projectId}/task-statuses`);
  return ((await resp.json())?.data?.items ?? []) as TaskStatus[];
}

async function createTask(
  request: APIRequestContext,
  projectId: string,
  title: string,
  statusId?: string,
): Promise<Task> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/tasks`, {
    data: { title, status_id: statusId ?? null },
  });
  return (await resp.json()).data as Task;
}

async function createBDDScenario(
  request: APIRequestContext,
  projectId: string,
  taskId: string,
  payload: { title: string; given?: string; when?: string; then?: string },
): Promise<BDDScenario> {
  const resp = await request.post(
    `${BASE_URL}/api/v1/projects/${projectId}/tasks/${taskId}/bdd-scenarios`,
    { data: { title: payload.title, given: payload.given ?? '', when: payload.when ?? '', then: payload.then ?? '' } },
  );
  return (await resp.json()).data as BDDScenario;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible();
}

async function openTaskDetail(page: Page, projectId: string, taskId: string): Promise<void> {
  await page.goto(`${BASE_URL}/projects/${projectId}/interactions/backlog`);
  // Navigate via URL query param that opens the task detail modal
  await page.goto(`${BASE_URL}/projects/${projectId}/interactions/backlog?taskId=${taskId}`);
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// =============================================================================
// Rule: Empty state
// =============================================================================

test.describe('BDD Scenarios — empty state', () => {
  let projectId: string;
  let task: Task;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}EMPTY_${RUN_ID}`);
    const statuses = await getTaskStatuses(request, projectId);
    const todo = statuses.find((s) => s.category === 'todo');
    task = await createTask(request, projectId, `${TEST_PROJECT_PREFIX}TASK_${RUN_ID}`, todo?.id);
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('shows empty state message when the task has no BDD scenarios', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await expect(page.getByText('No BDD scenarios yet')).toBeVisible({ timeout: 10_000 });
  });
});

// =============================================================================
// Rule: Creating BDD scenarios
// =============================================================================

test.describe('BDD Scenarios — create', () => {
  let projectId: string;
  let task: Task;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}CREATE_${RUN_ID}`);
    const statuses = await getTaskStatuses(request, projectId);
    const todo = statuses.find((s) => s.category === 'todo');
    task = await createTask(request, projectId, `${TEST_PROJECT_PREFIX}TASK_${RUN_ID}`, todo?.id);
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('creates a BDD scenario with a title only', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await page.getByRole('button', { name: 'Add scenario' }).click();
    await page.getByPlaceholder('Scenario title…').fill('User can log in');
    await page.getByRole('button', { name: 'Create scenario' }).click();

    await expect(page.getByText('User can log in')).toBeVisible({ timeout: 8_000 });
    // Empty state message should be gone
    await expect(page.getByText('No BDD scenarios yet')).not.toBeVisible();
  });

  test('creates a BDD scenario with Given / When / Then clauses', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await page.getByRole('button', { name: 'Add scenario' }).click();
    await page.getByPlaceholder('Scenario title…').fill('Successful login');

    // Expand Given/When/Then
    await page.getByRole('button', { name: /Add Given \/ When \/ Then/i }).click();

    await page.getByPlaceholder(/initial context or precondition/i).fill('a registered user');
    await page.getByPlaceholder(/action or event that occurs/i).fill('the user submits valid credentials');
    await page.getByPlaceholder(/expected outcome or result/i).fill('the user is redirected to the dashboard');

    await page.getByRole('button', { name: 'Create scenario' }).click();

    await expect(page.getByText('Successful login')).toBeVisible({ timeout: 8_000 });

    // Expand to verify clauses
    await page.getByText('Successful login').click();
    await expect(page.getByText('a registered user')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('the user submits valid credentials')).toBeVisible();
    await expect(page.getByText('the user is redirected to the dashboard')).toBeVisible();
  });

  test('does not create a scenario without a title (button stays disabled)', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await page.getByRole('button', { name: 'Add scenario' }).click();
    // Leave title blank
    const createBtn = page.getByRole('button', { name: 'Create scenario' });
    await expect(createBtn).toBeDisabled();
  });
});

// =============================================================================
// Rule: Editing BDD scenarios
// =============================================================================

test.describe('BDD Scenarios — update', () => {
  let projectId: string;
  let task: Task;
  let scenario: BDDScenario;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}UPDATE_${RUN_ID}`);
    const statuses = await getTaskStatuses(request, projectId);
    const todo = statuses.find((s) => s.category === 'todo');
    task = await createTask(request, projectId, `${TEST_PROJECT_PREFIX}TASK_${RUN_ID}`, todo?.id);
    scenario = await createBDDScenario(request, projectId, task.id, {
      title: 'Original Title',
      given: 'the app is running',
    });
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('edits the scenario title inline', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    // Verify the original title is present
    await expect(page.getByText('Original Title')).toBeVisible({ timeout: 10_000 });

    // Click the displayed title text to enter title-edit mode
    await page.getByText('Original Title').click();

    const titleInput = page.locator('input[value="Original Title"]');
    await titleInput.clear();
    await titleInput.fill('Updated Title');
    await titleInput.blur();

    await expect(page.getByText('Updated Title')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Original Title')).not.toBeVisible();
  });

  test('saves Given / When / Then clauses after expanding a scenario', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await expect(page.getByText('Original Title')).toBeVisible({ timeout: 10_000 });

    // Expand the scenario
    await page.getByText('Original Title').click();

    // The "Given" textarea should have the pre-filled value
    const givenTextarea = page.getByPlaceholder(/initial context or precondition/i);
    await expect(givenTextarea).toHaveValue('the app is running', { timeout: 5_000 });

    // Update the When clause and save
    await page.getByPlaceholder(/action or event that occurs/i).fill('the user clicks submit');
    await page.getByRole('button', { name: 'Save' }).click();

    // Collapse and re-expand to confirm persistence across renders
    await page.getByText('Original Title').click(); // collapse
    await page.getByText('Original Title').click(); // expand again

    await expect(page.getByPlaceholder(/action or event that occurs/i)).toHaveValue(
      'the user clicks submit',
      { timeout: 5_000 },
    );
  });
});

// =============================================================================
// Rule: Deleting BDD scenarios
// =============================================================================

test.describe('BDD Scenarios — delete', () => {
  let projectId: string;
  let task: Task;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}DELETE_${RUN_ID}`);
    const statuses = await getTaskStatuses(request, projectId);
    const todo = statuses.find((s) => s.category === 'todo');
    task = await createTask(request, projectId, `${TEST_PROJECT_PREFIX}TASK_${RUN_ID}`, todo?.id);
    await createBDDScenario(request, projectId, task.id, { title: 'To Be Deleted' });
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('deletes a BDD scenario via the delete icon', async ({ page }) => {
    await signIn(page);
    await openTaskDetail(page, projectId, task.id);

    await expect(page.getByText('To Be Deleted')).toBeVisible({ timeout: 10_000 });

    // Hover over card to reveal the delete button
    const scenarioCard = page.locator('[data-testid="bdd-scenario-card"]').filter({ hasText: 'To Be Deleted' });
    await scenarioCard.hover();

    await page.getByRole('button', { name: 'Delete scenario' }).click();

    await expect(page.getByText('To Be Deleted')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('No BDD scenarios yet')).toBeVisible();
  });
});
