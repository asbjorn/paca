package postgres

import (
	"context"
	"fmt"
	"time"

	apikeydom "github.com/Paca-AI/api/internal/domain/apikey"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// apiKeyRecord is the GORM write model for the api_keys table.
type apiKeyRecord struct {
	ID         string     `gorm:"primarykey;type:uuid"`
	UserID     string     `gorm:"column:user_id;type:uuid;not null"`
	Name       string     `gorm:"column:name;not null"`
	KeyPrefix  string     `gorm:"column:key_prefix;not null"`
	KeyHash    string     `gorm:"column:key_hash;not null;uniqueIndex"`
	LastUsedAt *time.Time `gorm:"column:last_used_at"`
	ExpiresAt  *time.Time `gorm:"column:expires_at"`
	CreatedAt  time.Time
	RevokedAt  *time.Time `gorm:"column:revoked_at"`
}

func (apiKeyRecord) TableName() string { return "api_keys" }

func apiKeyToEntity(r *apiKeyRecord) (*apikeydom.APIKey, error) {
	id, err := uuid.Parse(r.ID)
	if err != nil {
		return nil, fmt.Errorf("api key repo: parse record id %q: %w", r.ID, err)
	}
	userID, err := uuid.Parse(r.UserID)
	if err != nil {
		return nil, fmt.Errorf("api key repo: parse record user_id %q: %w", r.UserID, err)
	}
	return &apikeydom.APIKey{
		ID:         id,
		UserID:     userID,
		Name:       r.Name,
		KeyPrefix:  r.KeyPrefix,
		LastUsedAt: r.LastUsedAt,
		ExpiresAt:  r.ExpiresAt,
		CreatedAt:  r.CreatedAt,
		RevokedAt:  r.RevokedAt,
	}, nil
}

// APIKeyRepository is the GORM implementation of apikeydom.Repository.
type APIKeyRepository struct {
	db *gorm.DB
}

// NewAPIKeyRepository returns a new APIKeyRepository.
func NewAPIKeyRepository(db *gorm.DB) *APIKeyRepository {
	return &APIKeyRepository{db: db}
}

// FindByID returns the API key with the given ID.
func (r *APIKeyRepository) FindByID(ctx context.Context, id uuid.UUID) (*apikeydom.APIKey, error) {
	var rec apiKeyRecord
	result := r.db.WithContext(ctx).
		Where("id = ?", id.String()).
		First(&rec)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, apikeydom.ErrNotFound
		}
		return nil, fmt.Errorf("api key repo: find by id: %w", result.Error)
	}
	entity, err := apiKeyToEntity(&rec)
	if err != nil {
		return nil, err
	}
	return entity, nil
}

// FindByHash looks up an API key by its SHA-256 hash.
func (r *APIKeyRepository) FindByHash(ctx context.Context, keyHash string) (*apikeydom.APIKey, error) {
	var rec apiKeyRecord
	result := r.db.WithContext(ctx).
		Where("key_hash = ?", keyHash).
		First(&rec)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, apikeydom.ErrNotFound
		}
		return nil, fmt.Errorf("api key repo: find by hash: %w", result.Error)
	}
	entity, err := apiKeyToEntity(&rec)
	if err != nil {
		return nil, err
	}
	return entity, nil
}

// ListByUserID returns all non-revoked API keys for the given user.
func (r *APIKeyRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*apikeydom.APIKey, error) {
	var recs []apiKeyRecord
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND revoked_at IS NULL", userID.String()).
		Order("created_at DESC").
		Find(&recs).Error; err != nil {
		return nil, fmt.Errorf("api key repo: list: %w", err)
	}
	keys := make([]*apikeydom.APIKey, 0, len(recs))
	for i := range recs {
		entity, err := apiKeyToEntity(&recs[i])
		if err != nil {
			return nil, err
		}
		keys = append(keys, entity)
	}
	return keys, nil
}

// Create persists a new API key. The keyHash is stored; the raw key is never
// persisted.
func (r *APIKeyRepository) Create(ctx context.Context, key *apikeydom.APIKey, keyHash string) error {
	rec := apiKeyRecord{
		ID:        key.ID.String(),
		UserID:    key.UserID.String(),
		Name:      key.Name,
		KeyPrefix: key.KeyPrefix,
		KeyHash:   keyHash,
		ExpiresAt: key.ExpiresAt,
		CreatedAt: key.CreatedAt,
	}
	if err := r.db.WithContext(ctx).Create(&rec).Error; err != nil {
		return fmt.Errorf("api key repo: create: %w", err)
	}
	return nil
}

// Revoke soft-deletes an API key by setting revoked_at to now.
func (r *APIKeyRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	result := r.db.WithContext(ctx).
		Model(&apiKeyRecord{}).
		Where("id = ? AND revoked_at IS NULL", id.String()).
		Update("revoked_at", now)
	if result.Error != nil {
		return fmt.Errorf("api key repo: revoke: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return apikeydom.ErrNotFound
	}
	return nil
}

// UpdateLastUsed sets last_used_at on the given key.
func (r *APIKeyRepository) UpdateLastUsed(ctx context.Context, id uuid.UUID, at time.Time) error {
	if err := r.db.WithContext(ctx).
		Model(&apiKeyRecord{}).
		Where("id = ?", id.String()).
		Update("last_used_at", at).Error; err != nil {
		return fmt.Errorf("api key repo: update last used: %w", err)
	}
	return nil
}
