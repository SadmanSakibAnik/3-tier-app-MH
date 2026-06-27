package handlers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/mehedi/delivery-platform/internal/database"
	"github.com/mehedi/delivery-platform/internal/middleware"
	"github.com/mehedi/delivery-platform/internal/repositories"
	"github.com/mehedi/delivery-platform/internal/services"
	"github.com/mehedi/delivery-platform/internal/utils"
)

// ==========================================
// HealthHandler
// ==========================================

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Check(c *fiber.Ctx) error {
	sqlDB, err := database.DB.DB()
	dbStatus := "CONNECTED"
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "DISCONNECTED"
	}

	return c.JSON(fiber.Map{
		"status":   "UP",
		"database": dbStatus,
		"time":     strconv.FormatInt(c.Context().ConnTime().Unix(), 10),
	})
}

// ==========================================
// AuthHandler
// ==========================================

type AuthHandler struct {
	authService services.AuthService
	userRepo    repositories.UserRepository
}

func NewAuthHandler(authService services.AuthService, userRepo repositories.UserRepository) *AuthHandler {
	return &AuthHandler{authService: authService, userRepo: userRepo}
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required"`
	Phone    string `json:"phone" validate:"required"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	req := new(RegisterRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	user, err := h.authService.RegisterCustomer(req.Email, req.Password, req.Name, req.Phone)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user":    user,
	})
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	accessToken, refreshToken, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":       "Login successful",
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":          user,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	req := new(RefreshRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	newAccessToken, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"access_token": newAccessToken,
	})
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	req := new(ChangePasswordRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	userID := middleware.GetUserID(c)
	if err := h.authService.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Password changed successfully"})
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	return c.JSON(user)
}

// ==========================================
// OrderHandler
// ==========================================

type OrderHandler struct {
	orderService services.OrderService
}

func NewOrderHandler(orderService services.OrderService) *OrderHandler {
	return &OrderHandler{orderService: orderService}
}

type CreateOrderRequest struct {
	PickupName      string `json:"pickup_name" validate:"required"`
	PickupPhone     string `json:"pickup_phone" validate:"required"`
	PickupAddress   string `json:"pickup_address" validate:"required"`
	DeliveryName    string `json:"delivery_name" validate:"required"`
	DeliveryPhone   string `json:"delivery_phone" validate:"required"`
	DeliveryAddress string `json:"delivery_address" validate:"required"`
	PaymentMethod   string `json:"payment_method" validate:"required"` // CASH_ON_DELIVERY, etc.
	Notes           string `json:"notes"`
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	req := new(CreateOrderRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	customerID := middleware.GetUserID(c)
	order, err := h.orderService.CreateOrder(
		customerID,
		req.PickupName,
		req.PickupPhone,
		req.PickupAddress,
		req.DeliveryName,
		req.DeliveryPhone,
		req.DeliveryAddress,
		req.Notes,
		req.PaymentMethod,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *OrderHandler) GetByID(c *fiber.Ctx) error {
	orderIDStr := c.Params("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID format"})
	}

	order, err := h.orderService.GetOrderDetails(orderID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	// Safety check: customers can only view their own orders
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	if role == "CUSTOMER" && order.CustomerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied: unauthorized"})
	}

	return c.JSON(order)
}

func (h *OrderHandler) ListCustomerOrders(c *fiber.Ctx) error {
	customerID := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	status := c.Query("status", "")

	orders, total, err := h.orderService.ListCustomerOrders(customerID, page, limit, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":  orders,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

func (h *OrderHandler) Cancel(c *fiber.Ctx) error {
	orderIDStr := c.Params("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID format"})
	}

	customerID := middleware.GetUserID(c)
	if err := h.orderService.CancelOrder(orderID, customerID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Order cancelled successfully"})
}

// ==========================================
// AddressHandler
// ==========================================

type AddressHandler struct {
	addressService services.AddressService
}

func NewAddressHandler(addressService services.AddressService) *AddressHandler {
	return &AddressHandler{addressService: addressService}
}

type AddressRequest struct {
	Title        string `json:"title" validate:"required"`
	ContactName  string `json:"contact_name" validate:"required"`
	ContactPhone string `json:"contact_phone" validate:"required"`
	AddressLine  string `json:"address_line" validate:"required"`
	City         string `json:"city" validate:"required"`
	PostalCode   string `json:"postal_code"`
}

func (h *AddressHandler) Create(c *fiber.Ctx) error {
	req := new(AddressRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	customerID := middleware.GetUserID(c)
	address, err := h.addressService.CreateAddress(customerID, req.Title, req.ContactName, req.ContactPhone, req.AddressLine, req.City, req.PostalCode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(address)
}

func (h *AddressHandler) List(c *fiber.Ctx) error {
	customerID := middleware.GetUserID(c)
	addresses, err := h.addressService.GetCustomerAddresses(customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(addresses)
}

func (h *AddressHandler) Update(c *fiber.Ctx) error {
	addressIDStr := c.Params("id")
	addressID, err := uuid.Parse(addressIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid address ID format"})
	}

	req := new(AddressRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	customerID := middleware.GetUserID(c)
	address, err := h.addressService.UpdateAddress(addressID, customerID, req.Title, req.ContactName, req.ContactPhone, req.AddressLine, req.City, req.PostalCode)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(address)
}

func (h *AddressHandler) Delete(c *fiber.Ctx) error {
	addressIDStr := c.Params("id")
	addressID, err := uuid.Parse(addressIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid address ID format"})
	}

	customerID := middleware.GetUserID(c)
	if err := h.addressService.DeleteAddress(addressID, customerID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Address deleted successfully"})
}

// ==========================================
// AdminHandler
// ==========================================

type AdminHandler struct {
	adminService services.AdminDashboardService
	orderService services.OrderService
	userRepo     repositories.UserRepository
}

func NewAdminHandler(adminService services.AdminDashboardService, orderService services.OrderService, userRepo repositories.UserRepository) *AdminHandler {
	return &AdminHandler{adminService: adminService, orderService: orderService, userRepo: userRepo}
}

func (h *AdminHandler) GetDashboard(c *fiber.Ctx) error {
	stats, err := h.adminService.GetDashboardStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *AdminHandler) ListOrders(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	status := c.Query("status", "")
	search := c.Query("search", "")

	orders, total, err := h.orderService.ListAllOrders(page, limit, status, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":  orders,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required"`
	Notes  string `json:"notes"`
}

func (h *AdminHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	orderIDStr := c.Params("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID format"})
	}

	req := new(UpdateOrderStatusRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := utils.ValidateStruct(req); len(errs) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"errors": errs})
	}

	adminID := middleware.GetUserID(c)
	order, err := h.orderService.UpdateOrderStatus(orderID, req.Status, req.Notes, adminID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[ADMIN ORDER UPDATE] Order %s status updated to %s by admin %s", order.TrackingNumber, req.Status, adminID)
	return c.JSON(order)
}

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := c.Query("search", "")

	users, total, err := h.userRepo.FindAll(page, limit, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":  users,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}
