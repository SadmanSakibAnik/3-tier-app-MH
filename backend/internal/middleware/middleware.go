package middleware

import (
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"github.com/mehedi/delivery-platform/internal/utils"
)

// JWTAuth middleware verifies the token and injects claims to context
func JWTAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization token",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header format must be Bearer {token}",
			})
		}

		tokenString := parts[1]
		claims, err := utils.VerifyAccessToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired access token",
			})
		}

		// Save claims to Locals
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("name", claims.Name)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// RoleGuard restricts access to specific user roles
func RoleGuard(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleVal := c.Locals("role")
		if roleVal == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied: identity not verified",
			})
		}

		userRole := roleVal.(string)
		allowed := false
		for _, role := range allowedRoles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied: insufficient permissions",
			})
		}

		return c.Next()
	}
}

// ErrorHandler catches all exceptions and return a standard format
func ErrorHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[PANIC RECOVERY] %v", r)
				_ = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Internal server error occurred",
				})
			}
		}()
		return c.Next()
	}
}

// Logger logs HTTP request details
func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start)

		status := c.Response().StatusCode()
		log.Printf("[%s] %d - %s %s (%s)",
			c.IP(),
			status,
			c.Method(),
			c.Path(),
			duration,
		)
		return err
	}
}

// RateLimiter configures a basic IP-based request limiter
func RateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        100, // max 100 requests
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests. Please try again later.",
			})
		},
	})
}

// Helpers to extract user values from fiber context locals
func GetUserID(c *fiber.Ctx) uuid.UUID {
	val := c.Locals("userID")
	if val == nil {
		return uuid.Nil
	}
	return val.(uuid.UUID)
}

func GetUserRole(c *fiber.Ctx) string {
	val := c.Locals("role")
	if val == nil {
		return ""
	}
	return val.(string)
}
