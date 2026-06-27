package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/mehedi/delivery-platform/internal/config"
	"github.com/mehedi/delivery-platform/internal/database"
	"github.com/mehedi/delivery-platform/internal/middleware"
	"github.com/mehedi/delivery-platform/internal/routes"
)

func main() {
	log.Println("Starting Mehedi Delivery Platform API Service...")

	// 1. Load configuration
	config.LoadConfig()

	// 2. Connect to database
	database.Connect()

	// 3. Migrate database schemas
	database.Migrate()

	// 4. Seed default roles and super admin
	database.Seed()

	// 5. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "Mehedi Delivery Platform API v1.0",
		ErrorHandler: globalErrorHandler,
	})

	// 6. Setup middleware
	app.Use(recover.New()) // Recover from panic
	app.Use(middleware.Logger()) // Structured logging
	app.Use(middleware.RateLimiter()) // Request throttling

	// Configure CORS
	allowedOrigins := "*"
	if len(config.AppConfig.CORSAllowedOrigins) > 0 {
		allowedOrigins = corsJoin(config.AppConfig.CORSAllowedOrigins)
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// 7. Initialize Routes
	routes.SetupRoutes(app, database.DB)

	// 8. Start listening on port
	port := config.AppConfig.Port
	log.Printf("Server listening on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server shutdown unexpectedly: %v", err)
	}
}

// Global fiber error handler to match JSON specifications
func globalErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	log.Printf("[GLOBAL ERROR] Status Code %d: %v", code, err)

	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}

// Helper to join CORS origins
func corsJoin(origins []string) string {
	var res string
	for i, origin := range origins {
		if i > 0 {
			res += ", "
		}
		res += origin
	}
	return res
}
