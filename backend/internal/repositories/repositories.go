package repositories

import (
	"strings"

	"github.com/google/uuid"
	"github.com/mehedi/delivery-platform/internal/models"
	"gorm.io/gorm"
)

// ==========================================
// UserRepository Interface & Implementation
// ==========================================

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	FindAll(page, limit int, search string) ([]models.User, int64, error)
	Update(user *models.User) error
}

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepo) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Role").Where("email = ?", strings.ToLower(email)).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Role").Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindAll(page, limit int, search string) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	offset := (page - 1) * limit

	query := r.db.Model(&models.User{}).Preload("Role")
	if search != "" {
		searchVal := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ?", searchVal, searchVal)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Offset(offset).Limit(limit).Order("created_at desc").Find(&users).Error
	return users, total, err
}

func (r *userRepo) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// ==========================================
// OrderRepository Interface & Implementation
// ==========================================

type OrderRepository interface {
	Create(order *models.Order) error
	FindByID(id uuid.UUID) (*models.Order, error)
	FindByCustomerID(customerID uuid.UUID, page, limit int, status string) ([]models.Order, int64, error)
	FindAll(page, limit int, status, search string) ([]models.Order, int64, error)
	Update(order *models.Order) error
	CreateStatusHistory(history *models.OrderStatusHistory) error
	GetStats() (int64, int64, int64, float64, error)
}

type orderRepo struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepo{db: db}
}

func (r *orderRepo) Create(order *models.Order) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Save order (GORM automatically cascades and creates nested associations like Payment)
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		// Save initial history
		history := models.OrderStatusHistory{
			OrderID:     order.ID,
			Status:      order.Status,
			Notes:       "Order created successfully",
			UpdatedByID: order.CustomerID,
		}
		return tx.Create(&history).Error
	})
}

func (r *orderRepo) FindByID(id uuid.UUID) (*models.Order, error) {
	var order models.Order
	err := r.db.Preload("Customer").
		Preload("Payment").
		Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at desc").Preload("UpdatedBy")
		}).
		Where("id = ?", id).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepo) FindByCustomerID(customerID uuid.UUID, page, limit int, status string) ([]models.Order, int64, error) {
	var orders []models.Order
	var total int64
	offset := (page - 1) * limit

	query := r.db.Model(&models.Order{}).Where("customer_id = ?", customerID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Offset(offset).Limit(limit).Order("created_at desc").Find(&orders).Error
	return orders, total, err
}

func (r *orderRepo) FindAll(page, limit int, status, search string) ([]models.Order, int64, error) {
	var orders []models.Order
	var total int64
	offset := (page - 1) * limit

	query := r.db.Model(&models.Order{}).Preload("Customer")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if search != "" {
		searchVal := "%" + strings.ToLower(search) + "%"
		query = query.Where("tracking_number LIKE ? OR LOWER(pickup_name) LIKE ? OR LOWER(delivery_name) LIKE ?", searchVal, searchVal, searchVal)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Offset(offset).Limit(limit).Order("created_at desc").Find(&orders).Error
	return orders, total, err
}

func (r *orderRepo) Update(order *models.Order) error {
	return r.db.Save(order).Error
}

func (r *orderRepo) CreateStatusHistory(history *models.OrderStatusHistory) error {
	return r.db.Create(history).Error
}

func (r *orderRepo) GetStats() (int64, int64, int64, float64, error) {
	var totalOrders int64
	var activeOrders int64
	var deliveredOrders int64
	var totalRevenue float64

	// Total Orders
	if err := r.db.Model(&models.Order{}).Count(&totalOrders).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// Active Orders (Not Delivered, Cancelled or Returned)
	activeStatuses := []string{models.StatusPending, models.StatusConfirmed, models.StatusProcessing, models.StatusOutForDelivery}
	if err := r.db.Model(&models.Order{}).Where("status IN ?", activeStatuses).Count(&activeOrders).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// Delivered Orders
	if err := r.db.Model(&models.Order{}).Where("status = ?", models.StatusDelivered).Count(&deliveredOrders).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// Revenue Summary: Sum of payments for completed or cash orders
	var rev struct{ Total float64 }
	err := r.db.Model(&models.Payment{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("status = ?", models.PaymentStatusCompleted).
		Scan(&rev).Error

	totalRevenue = rev.Total
	return totalOrders, activeOrders, deliveredOrders, totalRevenue, err
}

// ==========================================
// AddressRepository Interface & Implementation
// ==========================================

type AddressRepository interface {
	Create(address *models.Address) error
	FindByID(id uuid.UUID) (*models.Address, error)
	FindByCustomerID(customerID uuid.UUID) ([]models.Address, error)
	Update(address *models.Address) error
	Delete(id uuid.UUID) error
}

type addressRepo struct {
	db *gorm.DB
}

func NewAddressRepository(db *gorm.DB) AddressRepository {
	return &addressRepo{db: db}
}

func (r *addressRepo) Create(address *models.Address) error {
	return r.db.Create(address).Error
}

func (r *addressRepo) FindByID(id uuid.UUID) (*models.Address, error) {
	var address models.Address
	err := r.db.Where("id = ?", id).First(&address).Error
	if err != nil {
		return nil, err
	}
	return &address, nil
}

func (r *addressRepo) FindByCustomerID(customerID uuid.UUID) ([]models.Address, error) {
	var addresses []models.Address
	err := r.db.Where("customer_id = ?", customerID).Order("title asc").Find(&addresses).Error
	return addresses, err
}

func (r *addressRepo) Update(address *models.Address) error {
	return r.db.Save(address).Error
}

func (r *addressRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Address{}, id).Error
}
