package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/mehedi/delivery-platform/internal/config"
	"github.com/mehedi/delivery-platform/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	var err error
	dsn := config.AppConfig.DatabaseURL

	log.Printf("Connecting to database with DSN: %s", dsn)

	// Retry connecting to DB a few times because postgres container might take longer to boot up
	for i := 1; i <= 5; i++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			break
		}
		log.Printf("Database connection failed (attempt %d/5): %v. Retrying in 5 seconds...", i, err)
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}

	log.Println("Database connection successfully established")
}

func Migrate() {
	log.Println("Running database migrations...")
	err := DB.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Address{},
		&models.Order{},
		&models.OrderStatusHistory{},
		&models.Payment{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migration completed successfully")
}

func Seed() {
	log.Println("Seeding database...")

	// 1. Seed Roles
	roles := []models.Role{
		{Name: models.RoleSuperAdmin, Description: "Super Administrator with full system control"},
		{Name: models.RoleAdmin, Description: "Administrator to manage orders, fees, and reports"},
		{Name: models.RoleCustomer, Description: "Customer user who places delivery orders"},
	}

	for _, role := range roles {
		var existingRole models.Role
		result := DB.Where("name = ?", role.Name).First(&existingRole)
		if result.Error == gorm.ErrRecordNotFound {
			role.ID = uuid.New()
			if err := DB.Create(&role).Error; err != nil {
				log.Printf("Error creating role %s: %v", role.Name, err)
			} else {
				log.Printf("Role %s successfully seeded", role.Name)
			}
		}
	}

	// Fetch Super Admin role for seeding user
	var superAdminRole models.Role
	if err := DB.Where("name = ?", models.RoleSuperAdmin).First(&superAdminRole).Error; err != nil {
		log.Fatalf("Could not find Super Admin role: %v", err)
	}

	// 2. Seed Default Super Admin
	adminEmail := "admin@mehedi.com"
	var existingAdmin models.User
	result := DB.Where("email = ?", adminEmail).First(&existingAdmin)
	if result.Error == gorm.ErrRecordNotFound {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("AdminPass123!"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash default admin password: %v", err)
		}

		adminUser := models.User{
			Email:        adminEmail,
			PasswordHash: string(hashedPassword),
			Name:         "Super Admin",
			Phone:        "+8801700000000",
			RoleID:       superAdminRole.ID,
		}
		adminUser.ID = uuid.New()

		if err := DB.Create(&adminUser).Error; err != nil {
			log.Printf("Error seeding default admin user: %v", err)
		} else {
			log.Println("Default admin user successfully seeded (Email: admin@mehedi.com)")
		}
	}
}
