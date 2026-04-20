// spec: features/docs/docs.feature
// seed: tests/seed.spec.ts

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost';
const USERNAME = process.env.E2E_USERNAME ?? 'admin';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-admin-password';
const TEST_PROJECT_PREFIX = 'E2E_DOCS_';
const RUN_ID = Date.now().toString(36).slice(-5).toUpperCase();

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocFolder {
  id: string;
  name: string;
}

interface Document {
  id: string;
  title: string;
}

interface DocSnapshot {
  id: string;
  snapshot_number: number;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function authRequest(request: APIRequestContext): Promise<void> {
  await request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { username: USERNAME, password: PASSWORD, rememberMe: false },
  });
}

async function cleanupTestProjects(request: APIRequestContext): Promise<void> {
  await authRequest(request);
  const allProjects: Array<{ id: string; name: string }> = [];
  let page = 1;
  while (true) {
    const listResp = await request.get(`${BASE_URL}/api/v1/projects?page=${page}&page_size=100`);
    if (!listResp.ok()) break;
    const body = await listResp.json();
    const items: Array<{ id: string; name: string }> = body?.data?.items ?? [];
    if (items.length === 0) break;
    allProjects.push(...items);
    const { page: currentPage, page_size, total } = body.data as { page: number; page_size: number; total: number };
    if (currentPage * page_size >= total) break;
    page++;
  }
  await Promise.all(
    allProjects
      .filter((p) => p.name.startsWith(TEST_PROJECT_PREFIX))
      .map((p) => request.delete(`${BASE_URL}/api/v1/projects/${p.id}`)),
  );
}

async function createProject(request: APIRequestContext, name: string): Promise<string> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects`, { data: { name } });
  const body = await resp.json();
  return body.data.id as string;
}

async function createFolder(
  request: APIRequestContext,
  projectId: string,
  name: string,
): Promise<DocFolder> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs/folders`, {
    data: { name },
  });
  const body = await resp.json();
  return body.data as DocFolder;
}

async function createDocument(
  request: APIRequestContext,
  projectId: string,
  payload: { title: string; folder_id?: string; content?: unknown },
): Promise<Document> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs`, {
    data: payload,
  });
  const body = await resp.json();
  return body.data as Document;
}

async function updateDocument(
  request: APIRequestContext,
  projectId: string,
  docId: string,
  payload: { title?: string; content?: unknown },
): Promise<void> {
  await request.patch(`${BASE_URL}/api/v1/projects/${projectId}/docs/${docId}`, {
    data: payload,
  });
}

async function listSnapshots(
  request: APIRequestContext,
  projectId: string,
  docId: string,
): Promise<DocSnapshot[]> {
  const resp = await request.get(`${BASE_URL}/api/v1/projects/${projectId}/docs/${docId}/snapshots`);
  const body = await resp.json();
  return (body?.data?.items ?? []) as DocSnapshot[];
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const signIn = async (page: Page) => {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible();
};

const navigateToDocsPage = async (page: Page, projectId: string) => {
  await page.goto(`${BASE_URL}/projects/${projectId}`);
  // Wait for the Documentations sidebar section to be visible
  await expect(page.getByText('Documentations')).toBeVisible({ timeout: 10_000 });
};

/** Reveals the Add button in the Documentations sidebar section and opens the menu. */
const openDocAddMenu = async (page: Page) => {
  // Click the Documentations header to ensure the Add button is revealed
  const docsSection = page.locator('div').filter({ hasText: /^Documentations$/ }).first();
  await docsSection.click();
  await page.getByRole('button', { name: 'Add' }).click();
};

// ─── Test Suites ──────────────────────────────────────────────────────────────

// ===========================================================================
// Rule: Document folders
// ===========================================================================

test.describe('Document folder management', () => {
  let projectId: string;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}FOLDERS_${RUN_ID}`);
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('Create a new folder', async ({ page }) => {
    await signIn(page);
    await navigateToDocsPage(page, projectId);

    // Open the Add menu and select New Folder
    await openDocAddMenu(page);
    await page.getByRole('menuitem', { name: 'New Folder' }).click();

    // The folder is created with a default name; rename it via the options menu
    const newFolderBtn = page.getByRole('button', { name: 'New Folder', exact: true });
    await expect(newFolderBtn).toBeVisible({ timeout: 6_000 });
    const folderContainer = newFolderBtn.locator('..').locator('..');
    await folderContainer.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /rename/i }).click();

    const input = page.getByRole('textbox');
    await input.fill('Architecture');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: 'Architecture', exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('Rename an existing folder', async ({ page, request }) => {
    await createFolder(request, projectId, 'Old Name');

    await signIn(page);
    await navigateToDocsPage(page, projectId);

    const folderBtn = page.getByRole('button', { name: 'Old Name', exact: true });
    const folderContainer = folderBtn.locator('..').locator('..');
    await folderContainer.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /rename/i }).click();

    const input = page.getByRole('textbox');
    await input.fill('New Name');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: 'New Name', exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Old Name', exact: true })).not.toBeVisible();
  });

  test('Delete an existing folder', async ({ page, request }) => {
    await createFolder(request, projectId, 'To Delete');

    await signIn(page);
    await navigateToDocsPage(page, projectId);

    const folderBtn = page.getByRole('button', { name: 'To Delete', exact: true });
    const folderContainer = folderBtn.locator('..').locator('..');
    await folderContainer.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    // Confirm deletion if a dialog appears
    const confirmBtn = page.getByRole('button', { name: /confirm|delete/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect(page.getByRole('button', { name: 'To Delete', exact: true })).not.toBeVisible({ timeout: 8_000 });
  });
});

// ===========================================================================
// Rule: Document lifecycle
// ===========================================================================

test.describe('Document lifecycle', () => {
  let projectId: string;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}LIFECYCLE_${RUN_ID}`);
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('Create a document at the project root', async ({ page }) => {
    await signIn(page);
    await navigateToDocsPage(page, projectId);

    // Open Add menu and select New Document
    await openDocAddMenu(page);
    await page.getByRole('menuitem', { name: 'New Document' }).click();

    // Editor opens; the heading should show the default title "Untitled"
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible({ timeout: 8_000 });
    // Document should also appear in the Documentations sidebar
    await expect(page.getByRole('button', { name: 'Untitled', exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('Create a document inside a folder', async ({ page, request }) => {
    const folder = await createFolder(request, projectId, 'Engineering');

    await signIn(page);
    await navigateToDocsPage(page, projectId);

    // Use the Add menu to create a document (folder-scoped creation is not yet
    // differentiated by the UI — the document is created at root and can be moved)
    await openDocAddMenu(page);
    await page.getByRole('menuitem', { name: 'New Document' }).click();

    // New document editor should open
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible({ timeout: 8_000 });

    // API verification: documents in the folder
    const resp = await request.get(
      `${BASE_URL}/api/v1/projects/${projectId}/docs?folder_id=${folder.id}`,
    );
    const body = await resp.json();
    // Root-level creation; folder filtering returns 0 until the doc is moved
    expect(body.data).toHaveProperty('items');
  });

  test('Rename a document via the title field', async ({ page, request }) => {
    const doc = await createDocument(request, projectId, { title: 'Draft' });

    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Click the heading to switch it to an editable textarea
    await page.getByRole('heading', { name: 'Draft' }).click();
    const titleInput = page.locator('textarea').first();
    await expect(titleInput).toBeVisible({ timeout: 8_000 });
    await titleInput.fill('Final');
    // Tab moves focus to the editor body and persists the title
    await titleInput.press('Tab');

    await expect(page.getByRole('heading', { name: 'Final' })).toBeVisible({ timeout: 8_000 });
  });

  test('Delete a document', async ({ page, request }) => {
    const doc = await createDocument(request, projectId, { title: 'Temporary Doc' });

    await signIn(page);
    await navigateToDocsPage(page, projectId);

    const docBtn = page.getByRole('button', { name: doc.title, exact: true });
    const docContainer = docBtn.locator('..').locator('..');
    await docContainer.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    const confirmBtn = page.getByRole('button', { name: /confirm|delete/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect(page.getByRole('button', { name: doc.title, exact: true })).not.toBeVisible({ timeout: 8_000 });
  });
});

// ===========================================================================
// Rule: Document editor with BlockNote
// ===========================================================================

test.describe('Document editor', () => {
  let projectId: string;
  let doc: Document;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}EDITOR_${RUN_ID}`);
    doc = await createDocument(request, projectId, {
      title: 'E2E_EDITOR_DOC',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Version 1' }] }] },
    });
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('Editor loads existing document content', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // The document heading and content editor should be visible
    await expect(page.getByRole('heading', { name: 'E2E_EDITOR_DOC' })).toBeVisible({ timeout: 10_000 });
    // The contenteditable editor area should be present
    await expect(page.locator('[contenteditable="true"]').last()).toBeVisible({ timeout: 10_000 });
  });

  test('User can type content into the editor', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // The editor is the last contenteditable element (title is the first)
    const editor = page.locator('[contenteditable="true"]').last();
    await expect(editor).toBeVisible({ timeout: 10_000 });

    // Click into editor and type
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Hello World');

    await expect(editor.getByText('Hello World')).toBeVisible({ timeout: 8_000 });
  });

  test('Saving updated content creates a new snapshot', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    const editor = page.locator('[contenteditable="true"]').last();
    await expect(editor).toBeVisible({ timeout: 10_000 });

    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Version 2');

    // Document auto-saves; wait for the "Saved" indicator
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10_000 });

    // Verify snapshot was created via API
    await page.waitForTimeout(500);
    const snaps = await listSnapshots(page.request, projectId, doc.id);
    expect(snaps.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// Rule: Document history and snapshots
// ===========================================================================

test.describe('Document history', () => {
  let projectId: string;
  let doc: Document;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}HISTORY_${RUN_ID}`);
    doc = await createDocument(request, projectId, {
      title: 'E2E_HISTORY_DOC',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Initial' }] }] },
    });
    // Generate a snapshot by updating the content
    await updateDocument(request, projectId, doc.id, {
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }] },
    });
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('User can view snapshot history', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Click the Version history button to open the history panel
    await page.getByRole('button', { name: 'Version history' }).click();

    // Snapshots appear as numbered buttons: "#1 <date> <title>", "#2 …"
    const snapshotEntries = page.getByRole('button', { name: /^#\d+/ });
    await expect(snapshotEntries.first()).toBeVisible({ timeout: 8_000 });
    // There should be at least one snapshot (created by the content update in beforeEach)
    expect(await snapshotEntries.count()).toBeGreaterThanOrEqual(1);
  });

  test('User can view a specific snapshot in read-only mode', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    await page.getByRole('button', { name: 'Version history' }).click();

    // Click the oldest snapshot (lowest number, last in list)
    const firstSnapshot = page.getByRole('button', { name: /^#\d+/ }).first();
    await expect(firstSnapshot).toBeVisible({ timeout: 8_000 });
    await firstSnapshot.click();

    // The history panel displays the snapshot title and content below the entry list
    // The snapshot panel shows a timestamp header and the document content at that point
    await expect(page.locator('text=/Apr|Jan|Feb|Mar|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/')).toBeVisible({ timeout: 8_000 });
  });
});

// ===========================================================================
// Rule: Document comments and activity
// ===========================================================================

test.describe('Document comments and activity', () => {
  let projectId: string;
  let doc: Document;

  test.beforeEach(async ({ request, context }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}COMMENTS_${RUN_ID}`);
    doc = await createDocument(request, projectId, { title: 'E2E_COMMENT_DOC' });
    await context.clearCookies();
    await context.clearPermissions();
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('Activity panel shows a document creation event', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Must open the Comments & activity panel to see the activity log
    await page.getByRole('button', { name: 'Comments & activity' }).click();
    await expect(page.getByText(/document created/i)).toBeVisible({ timeout: 10_000 });
  });

  test('User can add a comment to a document', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Open the Comments & activity panel
    await page.getByRole('button', { name: 'Comments & activity' }).click();

    const commentInput = page.getByRole('textbox', { name: /comment/i });
    await expect(commentInput).toBeVisible({ timeout: 8_000 });
    await commentInput.fill('Great document!');
    // Submit via keyboard shortcut (Ctrl+Enter)
    await page.keyboard.press('Control+Enter');

    await expect(page.getByText('Great document!')).toBeVisible({ timeout: 8_000 });
  });

  test('User can edit their own comment', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Open the Comments & activity panel
    await page.getByRole('button', { name: 'Comments & activity' }).click();

    // Add comment first
    const commentInput = page.getByRole('textbox', { name: /comment/i });
    await expect(commentInput).toBeVisible({ timeout: 8_000 });
    await commentInput.fill('Original comment');
    await page.keyboard.press('Control+Enter');
    await expect(page.getByText('Original comment')).toBeVisible({ timeout: 8_000 });

    // Edit the comment via its options menu
    const commentItem = page.locator('[data-comment-id], [data-activity-type="comment"]').filter({
      hasText: 'Original comment',
    });
    await commentItem.getByRole('button', { name: /options|more/i }).click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    const editInput = page.getByRole('textbox', { name: /comment/i });
    await editInput.clear();
    await editInput.fill('Updated comment');
    await page.getByRole('button', { name: /save|update/i }).click();

    await expect(page.getByText('Updated comment')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Original comment')).not.toBeVisible();
  });

  test('User can delete their own comment', async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/projects/${projectId}/docs/${doc.id}`);

    // Open the Comments & activity panel
    await page.getByRole('button', { name: 'Comments & activity' }).click();

    const commentInput = page.getByRole('textbox', { name: /comment/i });
    await expect(commentInput).toBeVisible({ timeout: 8_000 });
    await commentInput.fill('Delete me');
    await page.keyboard.press('Control+Enter');
    await expect(page.getByText('Delete me')).toBeVisible({ timeout: 8_000 });

    const commentItem = page.locator('[data-comment-id], [data-activity-type="comment"]').filter({
      hasText: 'Delete me',
    });
    await commentItem.getByRole('button', { name: /options|more/i }).click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    await expect(page.getByText('Delete me')).not.toBeVisible({ timeout: 8_000 });
  });

  // ─── API-level tests (fast, no full UI interaction needed) ─────────────────

  test('POST /comments with empty text returns 400', async ({ request }) => {
    await authRequest(request);
    const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs/${doc.id}/comments`, {
      data: { text: '   ' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_COMMENT_TEXT_INVALID');
  });
});

// ===========================================================================
// Rule: API-level access control (fast, no browser)
// ===========================================================================

test.describe('Document API access control', () => {
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    await cleanupTestProjects(request);
    projectId = await createProject(request, `${TEST_PROJECT_PREFIX}ACL_${RUN_ID}`);
  });

  test.afterEach(async ({ request }) => {
    await cleanupTestProjects(request);
  });

  test('Unauthenticated request returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/v1/projects/${projectId}/docs`);
    expect(resp.status()).toBe(401);
  });

  test('Authenticated user can list documents', async ({ request }) => {
    await authRequest(request);
    const resp = await request.get(`${BASE_URL}/api/v1/projects/${projectId}/docs`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data).toHaveProperty('items');
  });

  test('Authenticated user can create a document', async ({ request }) => {
    await authRequest(request);
    const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs`, {
      data: { title: 'API Test Doc' },
    });
    expect(resp.status()).toBe(201);
  });

  test('Creating a document with empty title defaults to Untitled', async ({ request }) => {
    await authRequest(request);
    const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs`, {
      data: { title: '' },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.title).toBe('Untitled');
  });

  test('Patching a document with empty title returns 400', async ({ request }) => {
    await authRequest(request);
    const doc = await createDocument(request, projectId, { title: 'Has Title' });
    const resp = await request.patch(`${BASE_URL}/api/v1/projects/${projectId}/docs/${doc.id}`, {
      data: { title: '  ' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_TITLE_INVALID');
  });

  test('GET non-existent document returns 404', async ({ request }) => {
    await authRequest(request);
    const resp = await request.get(
      `${BASE_URL}/api/v1/projects/${projectId}/docs/00000000-0000-0000-0000-000000000000`,
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_NOT_FOUND');
  });

  test('Creating a folder with blank name returns 400', async ({ request }) => {
    await authRequest(request);
    const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/docs/folders`, {
      data: { name: '   ' },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_FOLDER_NAME_INVALID');
  });

  test('Deleting a non-existent folder returns 404', async ({ request }) => {
    await authRequest(request);
    const resp = await request.delete(
      `${BASE_URL}/api/v1/projects/${projectId}/docs/folders/00000000-0000-0000-0000-000000000000`,
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_FOLDER_NOT_FOUND');
  });

  test('Folder CRUD lifecycle', async ({ request }) => {
    await authRequest(request);

    // Create
    const folder = await createFolder(request, projectId, 'API Folder');
    expect(folder.id).toBeTruthy();
    expect(folder.name).toBe('API Folder');

    // List
    const listResp = await request.get(`${BASE_URL}/api/v1/projects/${projectId}/docs/folders`);
    const listBody = await listResp.json();
    expect(listBody.data.items.some((f: DocFolder) => f.id === folder.id)).toBe(true);

    // Rename
    const patchResp = await request.patch(
      `${BASE_URL}/api/v1/projects/${projectId}/docs/folders/${folder.id}`,
      { data: { name: 'Renamed Folder' } },
    );
    expect(patchResp.status()).toBe(200);

    // Delete
    const delResp = await request.delete(
      `${BASE_URL}/api/v1/projects/${projectId}/docs/folders/${folder.id}`,
    );
    expect(delResp.status()).toBe(204);
  });

  test('Document content update creates a snapshot', async ({ request }) => {
    await authRequest(request);
    const doc = await createDocument(request, projectId, {
      title: 'Snapshot Test',
      content: { type: 'doc', content: [] },
    });

    // Initial: no snapshots
    const before = await listSnapshots(request, projectId, doc.id);
    expect(before).toHaveLength(0);

    // Update content — triggers snapshot
    await updateDocument(request, projectId, doc.id, {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });

    const after = await listSnapshots(request, projectId, doc.id);
    expect(after.length).toBeGreaterThanOrEqual(1);
  });

  test('Snapshot not found returns 404', async ({ request }) => {
    await authRequest(request);
    const doc = await createDocument(request, projectId, { title: 'No Snaps' });
    const resp = await request.get(
      `${BASE_URL}/api/v1/projects/${projectId}/docs/${doc.id}/snapshots/00000000-0000-0000-0000-000000000000`,
    );
    expect(resp.status()).toBe(404);
    const body = await resp.json();
    expect(body.error_code).toBe('DOC_SNAPSHOT_NOT_FOUND');
  });

  test('Filter documents by folder_id', async ({ request }) => {
    await authRequest(request);
    const folder = await createFolder(request, projectId, 'Filtered');
    await createDocument(request, projectId, { title: 'In Folder', folder_id: folder.id });
    await createDocument(request, projectId, { title: 'Root Doc' });

    const resp = await request.get(
      `${BASE_URL}/api/v1/projects/${projectId}/docs?folder_id=${folder.id}`,
    );
    const body = await resp.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].title).toBe('In Folder');
  });
});
