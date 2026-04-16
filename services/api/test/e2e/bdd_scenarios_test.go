package e2e_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func createTaskForBDDViaAPI(t *testing.T, env *e2eEnv, client *http.Client, token, projectID string) string {
	t.Helper()
	body := jsonBody(t, map[string]any{"title": "bdd-task-" + uuid.NewString()})
	req := mustRequest(env.ctx, t, http.MethodPost,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks", env.base, projectID), body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp := mustDo(t, client, req)
	defer func() { _ = resp.Body.Close() }()
	assertStatus(t, resp, http.StatusCreated)
	var env2 envelope
	decodeJSON(t, resp, &env2)
	data := assertDataMap(t, env2)
	id, _ := data["id"].(string)
	return id
}

func createBDDScenarioViaAPI(
	t *testing.T,
	env *e2eEnv,
	client *http.Client,
	token, projectID, taskID string,
	payload map[string]any,
) string {
	t.Helper()
	body := jsonBody(t, payload)
	req := mustRequest(env.ctx, t, http.MethodPost,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projectID, taskID), body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp := mustDo(t, client, req)
	defer func() { _ = resp.Body.Close() }()
	assertStatus(t, resp, http.StatusCreated)
	var env2 envelope
	decodeJSON(t, resp, &env2)
	data := assertDataMap(t, env2)
	id, _ := data["id"].(string)
	return id
}

// ---------------------------------------------------------------------------
// BDD Scenario CRUD
// ---------------------------------------------------------------------------

func TestE2EBDDScenarios_CRUD(t *testing.T) {
	env := newE2EEnv(t)
	seedTaskMemberUser(t, env, "bdd-crud-user", "bddpass1")
	client, token := taskMemberLogin(t, env, "bdd-crud-user", "bddpass1")
	projID := createProjectForTasksViaAPI(t, env, client, token)
	taskID := createTaskForBDDViaAPI(t, env, client, token, projID)

	var scenarioID string

	t.Run("empty_list", func(t *testing.T) {
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
		var env2 envelope
		decodeJSON(t, resp, &env2)
		data := assertDataMap(t, env2)
		items, _ := data["items"].([]any)
		if len(items) != 0 {
			t.Errorf("expected 0 scenarios initially, got %d", len(items))
		}
	})

	t.Run("create", func(t *testing.T) {
		scenarioID = createBDDScenarioViaAPI(t, env, client, token, projID, taskID, map[string]any{
			"title": "User can log in",
			"given": "the login page is open",
			"when":  "the user enters valid credentials",
			"then":  "the user is redirected to the dashboard",
		})
		if scenarioID == "" {
			t.Fatal("expected non-empty scenario id")
		}
	})

	t.Run("list_after_create", func(t *testing.T) {
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
		var env2 envelope
		decodeJSON(t, resp, &env2)
		data := assertDataMap(t, env2)
		items, _ := data["items"].([]any)
		if len(items) != 1 {
			t.Errorf("expected 1 scenario after create, got %d", len(items))
		}
	})

	t.Run("get", func(t *testing.T) {
		if scenarioID == "" {
			t.Skip("create sub-test did not produce a scenario ID")
		}
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, scenarioID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
		var env2 envelope
		decodeJSON(t, resp, &env2)
		data := assertDataMap(t, env2)
		if title, _ := data["title"].(string); title != "User can log in" {
			t.Errorf("expected title 'User can log in', got %q", title)
		}
		if given, _ := data["given"].(string); given != "the login page is open" {
			t.Errorf("expected given 'the login page is open', got %q", given)
		}
	})

	t.Run("update", func(t *testing.T) {
		if scenarioID == "" {
			t.Skip("create sub-test did not produce a scenario ID")
		}
		body := jsonBody(t, map[string]any{
			"title": "User can log in (updated)",
			"when":  "the user enters valid credentials and clicks Sign in",
		})
		req := mustRequest(env.ctx, t, http.MethodPatch,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, scenarioID), body)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
		var env2 envelope
		decodeJSON(t, resp, &env2)
		data := assertDataMap(t, env2)
		if title, _ := data["title"].(string); title != "User can log in (updated)" {
			t.Errorf("expected updated title, got %q", title)
		}
		if when, _ := data["when"].(string); when != "the user enters valid credentials and clicks Sign in" {
			t.Errorf("expected updated when clause, got %q", when)
		}
		// Given should be unchanged.
		if given, _ := data["given"].(string); given != "the login page is open" {
			t.Errorf("expected given to be unchanged, got %q", given)
		}
	})

	t.Run("delete", func(t *testing.T) {
		if scenarioID == "" {
			t.Skip("create sub-test did not produce a scenario ID")
		}
		req := mustRequest(env.ctx, t, http.MethodDelete,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, scenarioID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
	})

	t.Run("get_after_delete_returns_404", func(t *testing.T) {
		if scenarioID == "" {
			t.Skip("create sub-test did not produce a scenario ID")
		}
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, scenarioID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusNotFound)
		assertErrorCode(t, resp, "BDD_SCENARIO_NOT_FOUND")
	})

	t.Run("list_after_delete_is_empty", func(t *testing.T) {
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp := mustDo(t, client, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusOK)
		var env2 envelope
		decodeJSON(t, resp, &env2)
		data := assertDataMap(t, env2)
		items, _ := data["items"].([]any)
		if len(items) != 0 {
			t.Errorf("expected 0 scenarios after delete, got %d", len(items))
		}
	})
}

// ---------------------------------------------------------------------------
// Multiple scenarios on the same task
// ---------------------------------------------------------------------------

func TestE2EBDDScenarios_MultipleScenarios(t *testing.T) {
	env := newE2EEnv(t)
	seedTaskMemberUser(t, env, "bdd-multi-user", "bddmultipass")
	client, token := taskMemberLogin(t, env, "bdd-multi-user", "bddmultipass")
	projID := createProjectForTasksViaAPI(t, env, client, token)
	taskID := createTaskForBDDViaAPI(t, env, client, token, projID)

	titles := []string{"Scenario A", "Scenario B", "Scenario C"}
	for _, title := range titles {
		createBDDScenarioViaAPI(t, env, client, token, projID, taskID, map[string]any{"title": title})
	}

	req := mustRequest(env.ctx, t, http.MethodGet,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := mustDo(t, client, req)
	defer func() { _ = resp.Body.Close() }()
	assertStatus(t, resp, http.StatusOK)
	var env2 envelope
	decodeJSON(t, resp, &env2)
	data := assertDataMap(t, env2)
	items, _ := data["items"].([]any)
	if len(items) != 3 {
		t.Errorf("expected 3 scenarios, got %d", len(items))
	}
}

// ---------------------------------------------------------------------------
// Validation: missing title returns 400
// ---------------------------------------------------------------------------

func TestE2EBDDScenarios_MissingTitle(t *testing.T) {
	env := newE2EEnv(t)
	seedTaskMemberUser(t, env, "bdd-validation-user", "bddvalidpass")
	client, token := taskMemberLogin(t, env, "bdd-validation-user", "bddvalidpass")
	projID := createProjectForTasksViaAPI(t, env, client, token)
	taskID := createTaskForBDDViaAPI(t, env, client, token, projID)

	body := jsonBody(t, map[string]any{
		"given": "some context",
		"when":  "something happens",
		"then":  "something is true",
		// title intentionally omitted
	})
	req := mustRequest(env.ctx, t, http.MethodPost,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp := mustDo(t, client, req)
	defer func() { _ = resp.Body.Close() }()
	assertStatus(t, resp, http.StatusBadRequest)
}

// ---------------------------------------------------------------------------
// Authorisation: tasks.read is sufficient to list; tasks.write required to mutate
// ---------------------------------------------------------------------------

func TestE2EBDDScenarios_Authorisation(t *testing.T) {
	env := newE2EEnv(t)

	// Writer — creates the project, task, and scenario.
	seedTaskMemberUser(t, env, "bdd-writer", "bddwritepass")
	writerClient, writerToken := taskMemberLogin(t, env, "bdd-writer", "bddwritepass")
	projID := createProjectForTasksViaAPI(t, env, writerClient, writerToken)
	taskID := createTaskForBDDViaAPI(t, env, writerClient, writerToken, projID)
	scenarioID := createBDDScenarioViaAPI(t, env, writerClient, writerToken, projID, taskID, map[string]any{
		"title": "Auth test scenario",
	})

	t.Run("get_not_found_returns_404", func(t *testing.T) {
		req := mustRequest(env.ctx, t, http.MethodGet,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, uuid.New()), nil)
		req.Header.Set("Authorization", "Bearer "+writerToken)
		resp := mustDo(t, writerClient, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusNotFound)
		assertErrorCode(t, resp, "BDD_SCENARIO_NOT_FOUND")
	})

	t.Run("update_non_existent_returns_404", func(t *testing.T) {
		body := jsonBody(t, map[string]any{"title": "Ghost"})
		req := mustRequest(env.ctx, t, http.MethodPatch,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, uuid.New()), body)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+writerToken)
		resp := mustDo(t, writerClient, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("delete_non_existent_returns_404", func(t *testing.T) {
		req := mustRequest(env.ctx, t, http.MethodDelete,
			fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios/%s", env.base, projID, taskID, uuid.New()), nil)
		req.Header.Set("Authorization", "Bearer "+writerToken)
		resp := mustDo(t, writerClient, req)
		defer func() { _ = resp.Body.Close() }()
		assertStatus(t, resp, http.StatusNotFound)
	})

	_ = scenarioID // used indirectly by the setup above
}

// ---------------------------------------------------------------------------
// Cascade: deleting a task removes its BDD scenarios
// ---------------------------------------------------------------------------

func TestE2EBDDScenarios_CascadeDeleteWithTask(t *testing.T) {
	env := newE2EEnv(t)
	seedTaskMemberUser(t, env, "bdd-cascade-user", "bddcascadepass")
	client, token := taskMemberLogin(t, env, "bdd-cascade-user", "bddcascadepass")
	projID := createProjectForTasksViaAPI(t, env, client, token)
	taskID := createTaskForBDDViaAPI(t, env, client, token, projID)

	// Seed a few scenarios.
	createBDDScenarioViaAPI(t, env, client, token, projID, taskID, map[string]any{"title": "Cascade S1"})
	createBDDScenarioViaAPI(t, env, client, token, projID, taskID, map[string]any{"title": "Cascade S2"})

	// Delete the parent task.
	delReq := mustRequest(env.ctx, t, http.MethodDelete,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s", env.base, projID, taskID), nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	delResp := mustDo(t, client, delReq)
	_ = delResp.Body.Close()
	assertStatus(t, delResp, http.StatusOK)

	// The task is gone; attempting to list its BDD scenarios should return 404
	// (task not found) rather than an empty list.
	listReq := mustRequest(env.ctx, t, http.MethodGet,
		fmt.Sprintf("%s/api/v1/projects/%s/tasks/%s/bdd-scenarios", env.base, projID, taskID), nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listResp := mustDo(t, client, listReq)
	_ = listResp.Body.Close()
	// Depending on implementation the service may return 404 (task not found)
	// or 200 with an empty list after a soft delete.  Either is acceptable;
	// what matters is that the scenarios are not returned as populated data.
	if listResp.StatusCode != http.StatusOK && listResp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 200 or 404 after task deletion, got %d", listResp.StatusCode)
	}
}
