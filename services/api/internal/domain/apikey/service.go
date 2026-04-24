package apikeydom

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CreateInput carries the data needed to create a new API key.
type CreateInput struct {
	UserID    uuid.UUID
	Name      string
	ExpiresAt *time.Time
}

// Service defines the API key use-case contract.
type Service interface {
	// List returns all active (non-revoked) API keys for the given user.
	List(ctx context.Context, userID uuid.UUID) ([]*APIKey, error)
	// Create generates a new API key, persists its hash, and returns the key
	// along with the raw key value (returned ONLY on creation).
	Create(ctx context.Context, in CreateInput) (*APIKey, string, error)
	// Revoke revokes an API key. The caller must own the key.
	Revoke(ctx context.Context, userID, keyID uuid.UUID) error
	// Authenticate looks up and validates an API key by its raw value.
	// On success it returns the matching key record (with user ID).
	Authenticate(ctx context.Context, rawKey string) (*APIKey, error)
}
