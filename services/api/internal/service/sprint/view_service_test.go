// Package sprintsvc_test contains unit tests for the view service.
package sprintsvc_test

import (
	"context"
	"sync"
	"testing"

	"github.com/google/uuid"
	sprintdom "github.com/paca/api/internal/domain/sprint"
	sprintsvc "github.com/paca/api/internal/service/sprint"
)

// ---------------------------------------------------------------------------
// Fake ViewRepository
// ---------------------------------------------------------------------------

type fakeViewRepo struct {
	mu        sync.RWMutex
	views     map[uuid.UUID]*sprintdom.SprintView
	positions map[string]*sprintdom.ViewTaskPosition // key: viewID+":"+taskID
}

func newFakeViewRepo() *fakeViewRepo {
	return &fakeViewRepo{
		views:     make(map[uuid.UUID]*sprintdom.SprintView),
		positions: make(map[string]*sprintdom.ViewTaskPosition),
	}
}

func posKey(viewID, taskID uuid.UUID) string {
	return viewID.String() + ":" + taskID.String()
}

func (r *fakeViewRepo) ListViews(_ context.Context, sprintID uuid.UUID) ([]*sprintdom.SprintView, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []*sprintdom.SprintView
	for _, v := range r.views {
		if v.SprintID == sprintID {
			cp := *v
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (r *fakeViewRepo) FindViewByID(_ context.Context, id uuid.UUID) (*sprintdom.SprintView, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.views[id]
	if !ok {
		return nil, sprintdom.ErrViewNotFound
	}
	cp := *v
	return &cp, nil
}

func (r *fakeViewRepo) CreateView(_ context.Context, v *sprintdom.SprintView) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *v
	r.views[v.ID] = &cp
	return nil
}

func (r *fakeViewRepo) UpdateView(_ context.Context, v *sprintdom.SprintView) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.views[v.ID]; !ok {
		return sprintdom.ErrViewNotFound
	}
	cp := *v
	r.views[v.ID] = &cp
	return nil
}

func (r *fakeViewRepo) DeleteView(_ context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.views, id)
	return nil
}

func (r *fakeViewRepo) CountViews(_ context.Context, sprintID uuid.UUID) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, v := range r.views {
		if v.SprintID == sprintID {
			count++
		}
	}
	return count, nil
}

func (r *fakeViewRepo) UpsertTaskPosition(_ context.Context, pos *sprintdom.ViewTaskPosition) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *pos
	r.positions[posKey(pos.ViewID, pos.TaskID)] = &cp
	return nil
}

func (r *fakeViewRepo) ListTaskPositions(_ context.Context, viewID uuid.UUID) ([]*sprintdom.ViewTaskPosition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []*sprintdom.ViewTaskPosition
	for _, p := range r.positions {
		if p.ViewID == viewID {
			cp := *p
			out = append(out, &cp)
		}
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestViewService_CreateView_OK(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	sprintID := uuid.New()
	v, err := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: sprintID,
		Name:     "Backlog",
		ViewType: sprintdom.ViewTypeTable,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.Name != "Backlog" {
		t.Errorf("expected name=Backlog, got %q", v.Name)
	}
	if v.ViewType != sprintdom.ViewTypeTable {
		t.Errorf("expected view_type=table, got %q", v.ViewType)
	}
	if v.SprintID != sprintID {
		t.Errorf("sprint_id mismatch")
	}
}

func TestViewService_CreateView_DefaultTypeIsTable(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	v, err := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "My View",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.ViewType != sprintdom.ViewTypeTable {
		t.Errorf("expected default type=table, got %q", v.ViewType)
	}
}

func TestViewService_CreateView_EmptyNameReturnsError(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	_, err := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "   ",
		ViewType: sprintdom.ViewTypeBoard,
	})
	if err != sprintdom.ErrViewNameInvalid {
		t.Errorf("expected ErrViewNameInvalid, got %v", err)
	}
}

func TestViewService_CreateView_InvalidTypeReturnsError(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	_, err := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "Bad",
		ViewType: "gantt",
	})
	if err != sprintdom.ErrViewTypeInvalid {
		t.Errorf("expected ErrViewTypeInvalid, got %v", err)
	}
}

func TestViewService_GetView_OK(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	created, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "Sprint View",
		ViewType: sprintdom.ViewTypeBoard,
	})

	got, err := svc.GetView(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("id mismatch")
	}
}

func TestViewService_GetView_NotFound(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	_, err := svc.GetView(ctx, uuid.New())
	if err != sprintdom.ErrViewNotFound {
		t.Errorf("expected ErrViewNotFound, got %v", err)
	}
}

func TestViewService_UpdateView_Name(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	created, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "Old Name",
		ViewType: sprintdom.ViewTypeTable,
	})

	newName := "New Name"
	updated, err := svc.UpdateView(ctx, created.ID, sprintdom.UpdateViewInput{Name: &newName})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Name != "New Name" {
		t.Errorf("expected name=New Name, got %q", updated.Name)
	}
}

func TestViewService_UpdateView_Config(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	created, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "Board View",
		ViewType: sprintdom.ViewTypeBoard,
	})

	cfg := sprintdom.ViewConfig{ColumnBy: "status", Swimlanes: "assignee"}
	updated, err := svc.UpdateView(ctx, created.ID, sprintdom.UpdateViewInput{Config: &cfg})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Config.ColumnBy != "status" {
		t.Errorf("expected column_by=status, got %q", updated.Config.ColumnBy)
	}
}

func TestViewService_UpdateView_NotFound(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	name := "Does not matter"
	_, err := svc.UpdateView(ctx, uuid.New(), sprintdom.UpdateViewInput{Name: &name})
	if err != sprintdom.ErrViewNotFound {
		t.Errorf("expected ErrViewNotFound, got %v", err)
	}
}

func TestViewService_DeleteView_OK(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	sprintID := uuid.New()
	v1, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{SprintID: sprintID, Name: "V1", ViewType: sprintdom.ViewTypeTable})
	_, _ = svc.CreateView(ctx, sprintdom.CreateViewInput{SprintID: sprintID, Name: "V2", ViewType: sprintdom.ViewTypeBoard})

	if err := svc.DeleteView(ctx, v1.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err := svc.GetView(ctx, v1.ID)
	if err != sprintdom.ErrViewNotFound {
		t.Errorf("expected ErrViewNotFound after deletion, got %v", err)
	}
}

func TestViewService_DeleteView_LastViewRejected(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	v, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "Only View",
		ViewType: sprintdom.ViewTypeTable,
	})

	err := svc.DeleteView(ctx, v.ID)
	if err != sprintdom.ErrViewIsLastView {
		t.Errorf("expected ErrViewIsLastView, got %v", err)
	}
}

func TestViewService_DeleteView_NotFound(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	err := svc.DeleteView(ctx, uuid.New())
	if err != sprintdom.ErrViewNotFound {
		t.Errorf("expected ErrViewNotFound, got %v", err)
	}
}

func TestViewService_MoveTask_OK(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	v, _ := svc.CreateView(ctx, sprintdom.CreateViewInput{
		SprintID: uuid.New(),
		Name:     "V",
		ViewType: sprintdom.ViewTypeTable,
	})

	taskID := uuid.New()
	grp := "todo"
	if err := svc.MoveTask(ctx, v.ID, sprintdom.MoveTaskInput{
		TaskID:   taskID,
		Position: 3,
		GroupKey: &grp,
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	positions, err := svc.ListTaskPositions(ctx, v.ID)
	if err != nil {
		t.Fatalf("list positions: %v", err)
	}
	if len(positions) != 1 {
		t.Fatalf("expected 1 position, got %d", len(positions))
	}
	if positions[0].TaskID != taskID {
		t.Errorf("task_id mismatch")
	}
	if positions[0].Position != 3 {
		t.Errorf("expected position=3, got %d", positions[0].Position)
	}
}

func TestViewService_MoveTask_ViewNotFound(t *testing.T) {
	ctx := context.Background()
	svc := sprintsvc.NewViewService(newFakeViewRepo())

	err := svc.MoveTask(ctx, uuid.New(), sprintdom.MoveTaskInput{
		TaskID:   uuid.New(),
		Position: 0,
	})
	if err != sprintdom.ErrViewNotFound {
		t.Errorf("expected ErrViewNotFound, got %v", err)
	}
}

func TestViewService_ListViews_OK(t *testing.T) {
	ctx := context.Background()
	repo := newFakeViewRepo()
	svc := sprintsvc.NewViewService(repo)

	sprintID := uuid.New()
	_, _ = svc.CreateView(ctx, sprintdom.CreateViewInput{SprintID: sprintID, Name: "A", ViewType: sprintdom.ViewTypeTable})
	_, _ = svc.CreateView(ctx, sprintdom.CreateViewInput{SprintID: sprintID, Name: "B", ViewType: sprintdom.ViewTypeRoadmap})

	views, err := svc.ListViews(ctx, sprintID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(views) != 2 {
		t.Errorf("expected 2 views, got %d", len(views))
	}
}
