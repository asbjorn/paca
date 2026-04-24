package apikeydom

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository defines persistence operations for API keys.
type Repository interface {
	// FindByID returns the API key with the given ID.
	FindByID(ctx context.Context, id uuid.UUID) (*APIKey, error)
	// FindByHash looks up an API key by its SHA-256 hash.
	// Returns ErrNotFound when no matching key exists.
	FindByHash(ctx context.Context, keyHash string) (*APIKey, error)
	// ListByUserID returns all non-revoked API keys for the given user,
	// ordered by creation date descending.
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*APIKey, error)
	// Create persists a new API key.
	Create(ctx context.Context, key *APIKey, keyHash string) error
	// Revoke soft-deletes an API key by setting revoked_at.
	Revoke(ctx context.Context, id uuid.UUID) error
	// UpdateLastUsed sets last_used_at to the provided time.
	UpdateLastUsed(ctx context.Context, id uuid.UUID, at time.Time) error
}
