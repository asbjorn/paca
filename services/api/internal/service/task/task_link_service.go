package tasksvc

import (
	"context"
	"time"

	taskdom "github.com/Paca-AI/api/internal/domain/task"
	"github.com/google/uuid"
)

// ListTaskLinks returns all links for a task, computing display labels.
func (s *Service) ListTaskLinks(ctx context.Context, projectID, taskID uuid.UUID) ([]*taskdom.TaskLink, error) {
	// Verify task belongs to project.
	if _, err := s.repo.FindTaskByID(ctx, taskID); err != nil {
		return nil, err
	}
	return s.repo.ListTaskLinks(ctx, taskID)
}

// CreateTaskLink validates and persists a new directed link.
func (s *Service) CreateTaskLink(ctx context.Context, in taskdom.CreateTaskLinkInput) (*taskdom.TaskLink, error) {
	if in.SourceTaskID == in.TargetTaskID {
		return nil, taskdom.ErrTaskLinkSelf
	}
	if !taskdom.ValidLinkTypes[in.LinkType] {
		return nil, taskdom.ErrTaskLinkTypInvalid
	}

	source, err := s.repo.FindTaskByID(ctx, in.SourceTaskID)
	if err != nil {
		return nil, err
	}
	if source.ProjectID != in.ProjectID {
		return nil, taskdom.ErrTaskNotFound
	}

	target, err := s.repo.FindTaskByID(ctx, in.TargetTaskID)
	if err != nil {
		return nil, err
	}
	if target.ProjectID != in.ProjectID {
		return nil, taskdom.ErrTaskLinkCrossProject
	}

	exists, err := s.repo.LinkExists(ctx, in.SourceTaskID, in.TargetTaskID, in.LinkType)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, taskdom.ErrTaskLinkDuplicate
	}

	link := &taskdom.TaskLink{
		ID:           uuid.New(),
		SourceTaskID: in.SourceTaskID,
		TargetTaskID: in.TargetTaskID,
		LinkType:     in.LinkType,
		CreatedBy:    in.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.repo.CreateTaskLink(ctx, link); err != nil {
		return nil, err
	}

	// Populate the linked task summary for the response.
	link.LinkedTask = &taskdom.LinkedTaskSummary{
		ID:         target.ID,
		TaskNumber: target.TaskNumber,
		Title:      target.Title,
		StatusID:   target.StatusID,
		TaskTypeID: target.TaskTypeID,
	}
	link.DisplayLinkType = string(in.LinkType)
	return link, nil
}

// DeleteTaskLink removes a link after verifying it belongs to a task in projectID.
func (s *Service) DeleteTaskLink(ctx context.Context, projectID, taskID, linkID uuid.UUID) error {
	link, err := s.repo.FindTaskLinkByID(ctx, linkID)
	if err != nil {
		return err
	}
	// Verify the link actually belongs to the given task and project.
	if link.SourceTaskID != taskID && link.TargetTaskID != taskID {
		return taskdom.ErrTaskLinkNotFound
	}
	// Ensure the task is in the requested project.
	task, err := s.repo.FindTaskByID(ctx, taskID)
	if err != nil {
		return err
	}
	if task.ProjectID != projectID {
		return taskdom.ErrTaskLinkNotFound
	}
	return s.repo.DeleteTaskLink(ctx, linkID)
}
