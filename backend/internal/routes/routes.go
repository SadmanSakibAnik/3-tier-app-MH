package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/mehedi/delivery-platform/internal/handlers"
	"github.com/mehedi/delivery-platform/internal/middleware"
	"github.com/mehedi/delivery-platform/internal/repositories"
	"github.com/mehedi/delivery-platform/internal/services"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB) {
	// Initialize Repositories
	userRepo := repositories.NewUserRepository(db)
	orderRepo := repositories.NewOrderRepository(db)
	addressRepo := repositories.NewAddressRepository(db)

	// Initialize Services
	authService := services.NewAuthService(userRepo, db)
	orderService := services.NewOrderService(orderRepo, db)
	addressService := services.NewAddressService(addressRepo)
	adminService := services.NewAdminDashboardService(orderRepo, userRepo, db)

	// Initialize Handlers
	healthHandler := handlers.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(authService, userRepo)
	orderHandler := handlers.NewOrderHandler(orderService)
	addressHandler := handlers.NewAddressHandler(addressService)
	adminHandler := handlers.NewAdminHandler(adminService, orderService, userRepo)

	// Root-Level Health Check Endpoint
	app.Get("/hello", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Hello from Mehedi Delivery Platform! 🚀",
			"status":  "UP",
			"version": "1.0.0",
		})
	})

	// Swagger API Documentation Endpoint
	app.Get("/swagger", handlers.SwaggerUI)

	// Base API Group
	api := app.Group("/api/v1")

	// Public Health Check Route
	api.Get("/health", healthHandler.Check)

	// Auth Group (Public)
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)

	// Authenticated Routes
	secured := api.Group("", middleware.JWTAuth())

	// Profile & Settings
	secured.Get("/auth/profile", authHandler.GetProfile)
	secured.Put("/auth/password", authHandler.ChangePassword)

	// Address Routes (Customer specific)
	addresses := secured.Group("/addresses")
	addresses.Post("", addressHandler.Create)
	addresses.Get("", addressHandler.List)
	addresses.Put("/:id", addressHandler.Update)
	addresses.Delete("/:id", addressHandler.Delete)

	// Customer Orders Group
	orders := secured.Group("/orders")
	orders.Post("", orderHandler.Create)
	orders.Get("", orderHandler.ListCustomerOrders)
	orders.Get("/:id", orderHandler.GetByID)
	orders.Delete("/:id", orderHandler.Cancel) // Cancel order while pending

	// Admin-Only Group (Guard: SUPER_ADMIN, ADMIN)
	admin := secured.Group("/admin", middleware.RoleGuard("SUPER_ADMIN", "ADMIN"))
	admin.Get("/dashboard", adminHandler.GetDashboard)
	admin.Get("/orders", adminHandler.ListOrders)
	admin.Put("/orders/:id/status", adminHandler.UpdateOrderStatus)
	admin.Get("/users", adminHandler.ListUsers)
}
