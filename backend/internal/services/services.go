package services

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mehedi/delivery-platform/internal/models"
	"github.com/mehedi/delivery-platform/internal/repositories"
	"github.com/mehedi/delivery-platform/internal/utils"
	"gorm.io/gorm"
)

// ==========================================
// AuthService Interface & Implementation
// ==========================================

type AuthService interface {
	RegisterCustomer(email, password, name, phone string) (*models.User, error)
	Login(email, password string) (string, string, *models.User, error)
	RefreshToken(tokenString string) (string, error)
	ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error
}

type authService struct {
	userRepo repositories.UserRepository
	db       *gorm.DB
}

func NewAuthService(userRepo repositories.UserRepository, db *gorm.DB) AuthService {
	return &authService{userRepo: userRepo, db: db}
}

func (s *authService) RegisterCustomer(email, password, name, phone string) (*models.User, error) {
	// Check if email already exists
	_, err := s.userRepo.FindByEmail(email)
	if err == nil {
		return nil, errors.New("email address is already registered")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// Fetch Customer Role
	var customerRole models.Role
	if err := s.db.Where("name = ?", models.RoleCustomer).First(&customerRole).Error; err != nil {
		return nil, errors.New("internal system error: customer role not configured")
	}

	user := &models.User{
		Email:        strings.ToLower(email),
		PasswordHash: hashedPassword,
		Name:         name,
		Phone:        phone,
		RoleID:       customerRole.ID,
	}
	user.ID = uuid.New()

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Preload the Role relation for the response
	user.Role = customerRole
	return user, nil
}

func (s *authService) Login(email, password string) (string, string, *models.User, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return "", "", nil, errors.New("invalid email or password")
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", "", nil, errors.New("invalid email or password")
	}

	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, user.Name, user.Role.Name)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return accessToken, refreshToken, user, nil
}

func (s *authService) RefreshToken(tokenString string) (string, error) {
	claims, err := utils.VerifyRefreshToken(tokenString)
	if err != nil {
		return "", errors.New("invalid or expired refresh token")
	}

	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return "", errors.New("user not found")
	}

	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, user.Name, user.Role.Name)
	if err != nil {
		return "", fmt.Errorf("failed to generate access token: %w", err)
	}

	return accessToken, nil
}

func (s *authService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !utils.CheckPasswordHash(oldPassword, user.PasswordHash) {
		return errors.New("current password is incorrect")
	}

	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = hashedPassword
	return s.userRepo.Update(user)
}

// ==========================================
// OrderService Interface & Implementation
// ==========================================

type OrderService interface {
	CreateOrder(customerID uuid.UUID, pickupName, pickupPhone, pickupAddress, deliveryName, deliveryPhone, deliveryAddress, notes string, paymentMethod string) (*models.Order, error)
	GetOrderDetails(orderID uuid.UUID) (*models.Order, error)
	ListCustomerOrders(customerID uuid.UUID, page, limit int, status string) ([]models.Order, int64, error)
	ListAllOrders(page, limit int, status, search string) ([]models.Order, int64, error)
	UpdateOrderStatus(orderID uuid.UUID, status, notes string, updatedByID uuid.UUID) (*models.Order, error)
	CancelOrder(orderID uuid.UUID, customerID uuid.UUID) error
}

type orderService struct {
	orderRepo repositories.OrderRepository
	db        *gorm.DB
}

func NewOrderService(orderRepo repositories.OrderRepository, db *gorm.DB) OrderService {
	return &orderService{orderRepo: orderRepo, db: db}
}

func (s *orderService) CreateOrder(customerID uuid.UUID, pickupName, pickupPhone, pickupAddress, deliveryName, deliveryPhone, deliveryAddress, notes string, paymentMethod string) (*models.Order, error) {
	// Calculate Delivery Fee (Base fare ৳60.00 + random distance surcharge for realistic demo)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	distanceSurcharge := 20.0 + rng.Float64()*(150.0-20.0)
	deliveryFee := 60.0 + distanceSurcharge

	// Generate Tracking Number: MEH-YYYYMMDD-XXXX (4 random digits)
	dateStr := time.Now().Format("20060102")
	randomCode := rng.Intn(9000) + 1000 // 1000 to 9999
	trackingNum := fmt.Sprintf("MEH-%s-%d", dateStr, randomCode)

	order := &models.Order{
		TrackingNumber:  trackingNum,
		CustomerID:      customerID,
		PickupName:      pickupName,
		PickupPhone:     pickupPhone,
		PickupAddress:   pickupAddress,
		DeliveryName:    deliveryName,
		DeliveryPhone:   deliveryPhone,
		DeliveryAddress: deliveryAddress,
		DeliveryFee:     deliveryFee,
		Status:          models.StatusPending,
		Notes:           notes,
		Payment: &models.Payment{
			Amount: deliveryFee,
			Status: models.PaymentStatusPending,
			Method: paymentMethod,
		},
	}
	order.ID = uuid.New()

	if err := s.orderRepo.Create(order); err != nil {
		return nil, err
	}

	return order, nil
}

func (s *orderService) GetOrderDetails(orderID uuid.UUID) (*models.Order, error) {
	return s.orderRepo.FindByID(orderID)
}

func (s *orderService) ListCustomerOrders(customerID uuid.UUID, page, limit int, status string) ([]models.Order, int64, error) {
	return s.orderRepo.FindByCustomerID(customerID, page, limit, status)
}

func (s *orderService) ListAllOrders(page, limit int, status, search string) ([]models.Order, int64, error) {
	return s.orderRepo.FindAll(page, limit, status, search)
}

func (s *orderService) UpdateOrderStatus(orderID uuid.UUID, status, notes string, updatedByID uuid.UUID) (*models.Order, error) {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return nil, errors.New("order not found")
	}

	// Validate status transition
	if !isValidStatusTransition(order.Status, status) {
		return nil, fmt.Errorf("invalid status transition from %s to %s", order.Status, status)
	}

	// Begin status update transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		order.Status = status
		if err := tx.Save(order).Error; err != nil {
			return err
		}

		// Insert history entry
		history := models.OrderStatusHistory{
			OrderID:     order.ID,
			Status:      status,
			Notes:       notes,
			UpdatedByID: updatedByID,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		// If status is DELIVERED, automatically complete payment (e.g. COD orders)
		if status == models.StatusDelivered && order.Payment != nil && order.Payment.Status == models.PaymentStatusPending {
			order.Payment.Status = models.PaymentStatusCompleted
			order.Payment.UpdatedAt = time.Now()
			if err := tx.Save(order.Payment).Error; err != nil {
				return err
			}
		}

		// If status is CANCELLED, mark payment cancelled/refunded if pending
		if status == models.StatusCancelled && order.Payment != nil && order.Payment.Status == models.PaymentStatusPending {
			order.Payment.Status = models.PaymentStatusFailed
			order.Payment.UpdatedAt = time.Now()
			if err := tx.Save(order.Payment).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Re-load full details to return updated object
	return s.orderRepo.FindByID(orderID)
}

func (s *orderService) CancelOrder(orderID uuid.UUID, customerID uuid.UUID) error {
	order, err := s.orderRepo.FindByID(orderID)
	if err != nil {
		return errors.New("order not found")
	}

	if order.CustomerID != customerID {
		return errors.New("unauthorized: order belongs to another customer")
	}

	if order.Status != models.StatusPending {
		return fmt.Errorf("cannot cancel order in %s status. Orders can only be cancelled while PENDING", order.Status)
	}

	_, err = s.UpdateOrderStatus(orderID, models.StatusCancelled, "Cancelled by customer", customerID)
	return err
}

func isValidStatusTransition(current, next string) bool {
	// Status workflow rules
	switch current {
	case models.StatusPending:
		return next == models.StatusConfirmed || next == models.StatusCancelled
	case models.StatusConfirmed:
		return next == models.StatusProcessing || next == models.StatusCancelled
	case models.StatusProcessing:
		return next == models.StatusOutForDelivery || next == models.StatusCancelled
	case models.StatusOutForDelivery:
		return next == models.StatusDelivered || next == models.StatusReturned
	case models.StatusDelivered, models.StatusReturned, models.StatusCancelled:
		// Terminal states: no changes allowed
		return false
	default:
		return false
	}
}

// ==========================================
// AddressService Interface & Implementation
// ==========================================

type AddressService interface {
	CreateAddress(customerID uuid.UUID, title, name, phone, addressLine, city, postalCode string) (*models.Address, error)
	GetCustomerAddresses(customerID uuid.UUID) ([]models.Address, error)
	UpdateAddress(addressID uuid.UUID, customerID uuid.UUID, title, name, phone, addressLine, city, postalCode string) (*models.Address, error)
	DeleteAddress(addressID uuid.UUID, customerID uuid.UUID) error
}

type addressService struct {
	addressRepo repositories.AddressRepository
}

func NewAddressService(addressRepo repositories.AddressRepository) AddressService {
	return &addressService{addressRepo: addressRepo}
}

func (s *addressService) CreateAddress(customerID uuid.UUID, title, name, phone, addressLine, city, postalCode string) (*models.Address, error) {
	address := &models.Address{
		CustomerID:   customerID,
		Title:        title,
		ContactName:  name,
		ContactPhone: phone,
		AddressLine:  addressLine,
		City:         city,
		PostalCode:   postalCode,
	}
	address.ID = uuid.New()

	if err := s.addressRepo.Create(address); err != nil {
		return nil, err
	}
	return address, nil
}

func (s *addressService) GetCustomerAddresses(customerID uuid.UUID) ([]models.Address, error) {
	return s.addressRepo.FindByCustomerID(customerID)
}

func (s *addressService) UpdateAddress(addressID uuid.UUID, customerID uuid.UUID, title, name, phone, addressLine, city, postalCode string) (*models.Address, error) {
	address, err := s.addressRepo.FindByID(addressID)
	if err != nil {
		return nil, errors.New("address not found")
	}

	if address.CustomerID != customerID {
		return nil, errors.New("unauthorized access to address")
	}

	address.Title = title
	address.ContactName = name
	address.ContactPhone = phone
	address.AddressLine = addressLine
	address.City = city
	address.PostalCode = postalCode
	address.UpdatedAt = time.Now()

	if err := s.addressRepo.Update(address); err != nil {
		return nil, err
	}
	return address, nil
}

func (s *addressService) DeleteAddress(addressID uuid.UUID, customerID uuid.UUID) error {
	address, err := s.addressRepo.FindByID(addressID)
	if err != nil {
		return errors.New("address not found")
	}

	if address.CustomerID != customerID {
		return errors.New("unauthorized access to address")
	}

	return s.addressRepo.Delete(addressID)
}

// ==========================================
// AdminDashboardService Interface
// ==========================================

type AdminDashboardService interface {
	GetDashboardStats() (map[string]interface{}, error)
}

type adminDashboardService struct {
	orderRepo repositories.OrderRepository
	userRepo  repositories.UserRepository
	db        *gorm.DB
}

func NewAdminDashboardService(orderRepo repositories.OrderRepository, userRepo repositories.UserRepository, db *gorm.DB) AdminDashboardService {
	return &adminDashboardService{orderRepo: orderRepo, userRepo: userRepo, db: db}
}

func (s *adminDashboardService) GetDashboardStats() (map[string]interface{}, error) {
	totalOrders, activeOrders, deliveredOrders, totalRevenue, err := s.orderRepo.GetStats()
	if err != nil {
		return nil, err
	}

	// Total Customers: count users where role is CUSTOMER
	var totalCustomers int64
	var customerRole models.Role
	if err := s.db.Where("name = ?", models.RoleCustomer).First(&customerRole).Error; err == nil {
		s.db.Model(&models.User{}).Where("role_id = ?", customerRole.ID).Count(&totalCustomers)
	}

	stats := map[string]interface{}{
		"total_orders":      totalOrders,
		"active_orders":     activeOrders,
		"delivered_orders":  deliveredOrders,
		"total_customers":   totalCustomers,
		"total_revenue":     totalRevenue,
	}

	return stats, nil
}
