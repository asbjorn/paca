package handler

import (
	"github.com/Paca-AI/api/internal/apierr"
	apikeydom "github.com/Paca-AI/api/internal/domain/apikey"
	"github.com/Paca-AI/api/internal/transport/http/dto"
	"github.com/Paca-AI/api/internal/transport/http/middleware"
	"github.com/Paca-AI/api/internal/transport/http/presenter"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// APIKeyHandler handles API key management endpoints.
type APIKeyHandler struct {
	svc apikeydom.Service
}

// NewAPIKeyHandler returns an APIKeyHandler wired to the provided service.
func NewAPIKeyHandler(svc apikeydom.Service) *APIKeyHandler {
	return &APIKeyHandler{svc: svc}
}

// List handles GET /users/me/api-keys.
func (h *APIKeyHandler) List(c *gin.Context) {
	userID, ok := resolveCallerID(c)
	if !ok {
		return
	}

	keys, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		presenter.Error(c, err)
		return
	}

	resp := make([]dto.APIKeyResponse, 0, len(keys))
	for _, k := range keys {
		resp = append(resp, dto.APIKeyFromEntity(k))
	}
	presenter.OK(c, resp)
}

// Create handles POST /users/me/api-keys.
func (h *APIKeyHandler) Create(c *gin.Context) {
	userID, ok := resolveCallerID(c)
	if !ok {
		return
	}

	var req dto.CreateAPIKeyRequest
	if !middleware.BindJSON(c, &req) {
		return
	}

	in := apikeydom.CreateInput{
		UserID:    userID,
		Name:      req.Name,
		ExpiresAt: req.ExpiresAt,
	}

	key, rawKey, err := h.svc.Create(c.Request.Context(), in)
	if err != nil {
		presenter.Error(c, err)
		return
	}

	resp := dto.CreateAPIKeyResponse{
		APIKeyResponse: dto.APIKeyFromEntity(key),
		Key:            rawKey,
	}
	presenter.Created(c, resp)
}

// Revoke handles DELETE /users/me/api-keys/:keyId.
func (h *APIKeyHandler) Revoke(c *gin.Context) {
	userID, ok := resolveCallerID(c)
	if !ok {
		return
	}

	keyID, err := uuid.Parse(c.Param("keyId"))
	if err != nil {
		presenter.Error(c, apierr.New(apierr.CodeBadRequest, "invalid key ID"))
		return
	}

	if err := h.svc.Revoke(c.Request.Context(), userID, keyID); err != nil {
		presenter.Error(c, err)
		return
	}

	presenter.NoContent(c)
}

// resolveCallerID extracts the authenticated user's ID from JWT claims.
func resolveCallerID(c *gin.Context) (uuid.UUID, bool) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		presenter.Error(c, apierr.New(apierr.CodeUnauthenticated, "unauthenticated"))
		return uuid.Nil, false
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		presenter.Error(c, apierr.New(apierr.CodeBadRequest, "invalid subject claim"))
		return uuid.Nil, false
	}
	return id, true
}
