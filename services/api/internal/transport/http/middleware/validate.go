package middleware

import (
	"github.com/Paca-AI/api/internal/apierr"
	"github.com/Paca-AI/api/internal/transport/http/presenter"
	"github.com/gin-gonic/gin"
)

// BindJSON binds the JSON body into dst and aborts with 400 on failure.
// Use this in handlers to keep binding logic concise.
func BindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		presenter.Error(c, apierr.New(apierr.CodeBadRequest, err.Error()))
		return false
	}
	return true
}
