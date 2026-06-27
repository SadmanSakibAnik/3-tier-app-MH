package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	JWTSecret           string
	JWTRefreshSecret    string
	JWTAccessExpiryMins int
	JWTRefreshExpiryDays int
	CORSAllowedOrigins  []string
}

var AppConfig *Config

func LoadConfig() {
	// Load .env file if it exists, otherwise read system environment
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from system environment variables")
	}

	AppConfig = &Config{
		Port:                 getEnv("PORT", "8000"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@postgres:5432/mehedi_delivery?sslmode=disable"),
		JWTSecret:           getEnv("JWT_SECRET", "super-secret-access-token-key-change-in-production"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "super-secret-refresh-token-key-change-in-production"),
		JWTAccessExpiryMins: getEnvInt("JWT_ACCESS_EXPIRY_MINUTES", 15),
		JWTRefreshExpiryDays: getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 7),
		CORSAllowedOrigins:  strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://app.mehedi.com,http://admin.mehedi.com"), ","),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		log.Printf("Warning: environment variable %s is not an integer, using default: %d", key, defaultValue)
		return defaultValue
	}
	return value
}
