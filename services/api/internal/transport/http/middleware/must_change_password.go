package middleware

import (
	"github.com/Paca-AI/api/internal/apierr"
	"github.com/Paca-AI/api/internal/transport/http/presenter"
	"github.com/gin-gonic/gin"
)

// RequireFreshPassword rejects any request whose access token carries
// MustChangePassword=true. Apply this middleware after Authn on every route
// except PATCH /users/me/password.
func RequireFreshPassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := ClaimsFrom(c)
		if claims != nil && claims.MustChangePassword {
			presenter.Error(c, apierr.New(
				apierr.CodePasswordChangeRequired,
				"you must change your password before accessing this resource",
			))
			return
		}
		c.Next()
	}
}
