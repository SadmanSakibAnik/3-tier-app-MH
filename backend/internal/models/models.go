package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role constants
const (
	RoleSuperAdmin = "SUPER_ADMIN"
	RoleAdmin      = "ADMIN"
	RoleCustomer   = "CUSTOMER"
)

// Order status constants
const (
	StatusPending        = "PENDING"
	StatusConfirmed      = "CONFIRMED"
	StatusProcessing     = "PROCESSING"
	StatusOutForDelivery = "OUT_FOR_DELIVERY"
	StatusDelivered      = "DELIVERED"
	StatusReturned       = "RETURNED"
	StatusCancelled      = "CANCELLED"
)

// Payment status constants
const (
	PaymentStatusPending   = "PENDING"
	PaymentStatusCompleted = "COMPLETED"
	PaymentStatusFailed    = "FAILED"
	PaymentStatusRefunded  = "REFUNDED"
)

// Base model using UUIDs
type Base struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// GORM Hook to generate UUID before create
func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

type Role struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"uniqueIndex;not null" json:"name"`
	Description string    `json:"description"`
}

type User struct {
	Base
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Name         string    `gorm:"not null" json:"name"`
	Phone        string    `json:"phone"`
	RoleID       uuid.UUID `gorm:"type:uuid;not null" json:"role_id"`
	Role         Role      `gorm:"foreignKey:RoleID" json:"role"`
}

type Address struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CustomerID   uuid.UUID `gorm:"type:uuid;not null;index" json:"customer_id"`
	Title        string    `gorm:"not null" json:"title"` // e.g. "Home", "Office"
	ContactName  string    `gorm:"not null" json:"contact_name"`
	ContactPhone string    `gorm:"not null" json:"contact_phone"`
	AddressLine  string    `gorm:"not null" json:"address_line"`
	City         string    `gorm:"not null" json:"city"`
	PostalCode   string    `json:"postal_code"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (a *Address) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type Order struct {
	Base
	TrackingNumber  string               `gorm:"uniqueIndex;not null" json:"tracking_number"`
	CustomerID      uuid.UUID            `gorm:"type:uuid;not null;index" json:"customer_id"`
	Customer        User                 `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	PickupName      string               `gorm:"not null" json:"pickup_name"`
	PickupPhone     string               `gorm:"not null" json:"pickup_phone"`
	PickupAddress   string               `gorm:"not null" json:"pickup_address"`
	DeliveryName    string               `gorm:"not null" json:"delivery_name"`
	DeliveryPhone   string               `gorm:"not null" json:"delivery_phone"`
	DeliveryAddress string               `gorm:"not null" json:"delivery_address"`
	DeliveryFee     float64              `gorm:"type:numeric(10,2);not null" json:"delivery_fee"`
	Status          string               `gorm:"default:'PENDING';index" json:"status"`
	Notes           string               `json:"notes"`
	StatusHistory   []OrderStatusHistory `gorm:"foreignKey:OrderID" json:"status_history,omitempty"`
	Payment         *Payment             `gorm:"foreignKey:OrderID" json:"payment,omitempty"`
}

type OrderStatusHistory struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrderID     uuid.UUID `gorm:"type:uuid;not null;index" json:"order_id"`
	Status      string    `gorm:"not null" json:"status"`
	Notes       string    `json:"notes"`
	UpdatedByID uuid.UUID `gorm:"type:uuid;not null" json:"updated_by_id"`
	UpdatedBy   User      `gorm:"foreignKey:UpdatedByID" json:"updated_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (o *OrderStatusHistory) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrderID       uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"order_id"`
	Amount        float64   `gorm:"type:numeric(10,2);not null" json:"amount"`
	Status        string    `gorm:"default:'PENDING'" json:"status"`
	Method        string    `gorm:"not null" json:"method"` // CASH_ON_DELIVERY, BKASH, etc.
	TransactionID string    `json:"transaction_id"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Title     string    `gorm:"not null" json:"title"`
	Message   string    `gorm:"not null" json:"message"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
