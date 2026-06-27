package handlers

import "github.com/gofiber/fiber/v2"

// SwaggerUI serves an embedded Swagger UI page with full API documentation for the Mehedi Delivery Platform.
func SwaggerUI(c *fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(swaggerHTML)
}

const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mehedi Delivery Platform — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { font-size: 2rem; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: {
        openapi: "3.0.3",
        info: {
          title: "Mehedi Delivery Platform API",
          version: "1.0.0",
          description: "REST API for the Mehedi Delivery Management Platform. Supports customer order placement, admin order management, address book, and authentication. Currency: BDT (৳)."
        },
        servers: [
          { url: "/api/v1", description: "API v1" }
        ],
        tags: [
          { name: "Health", description: "System health checks" },
          { name: "Auth", description: "Authentication & user management" },
          { name: "Orders", description: "Customer order operations" },
          { name: "Addresses", description: "Customer address book" },
          { name: "Admin", description: "Admin dashboard & order management" }
        ],
        paths: {
          "/health": {
            get: {
              tags: ["Health"],
              summary: "API Health Check",
              description: "Returns API and database connection status.",
              responses: {
                "200": {
                  description: "Service is healthy",
                  content: { "application/json": { schema: { type: "object", properties: {
                    status: { type: "string", example: "UP" },
                    database: { type: "string", example: "CONNECTED" },
                    time: { type: "string", example: "1718600000" }
                  }}}}
                }
              }
            }
          },
          "/auth/register": {
            post: {
              tags: ["Auth"],
              summary: "Register a new customer",
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["email","password","name","phone"], properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", minLength: 6, example: "secret123" },
                  name: { type: "string", example: "Mehedi Hasan" },
                  phone: { type: "string", example: "01712345678" }
                }}}}
              },
              responses: {
                "201": { description: "Registration successful" },
                "400": { description: "Validation error or email already exists" }
              }
            }
          },
          "/auth/login": {
            post: {
              tags: ["Auth"],
              summary: "Login and receive JWT tokens",
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["email","password"], properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", example: "secret123" }
                }}}}
              },
              responses: {
                "200": { description: "Login successful, returns access_token, refresh_token, and user" },
                "401": { description: "Invalid credentials" }
              }
            }
          },
          "/auth/refresh": {
            post: {
              tags: ["Auth"],
              summary: "Refresh access token",
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["refresh_token"], properties: {
                  refresh_token: { type: "string" }
                }}}}
              },
              responses: {
                "200": { description: "New access token issued" },
                "401": { description: "Invalid or expired refresh token" }
              }
            }
          },
          "/auth/profile": {
            get: {
              tags: ["Auth"],
              summary: "Get current user profile",
              security: [{ BearerAuth: [] }],
              responses: {
                "200": { description: "User profile data" },
                "401": { description: "Unauthorized" }
              }
            }
          },
          "/auth/password": {
            put: {
              tags: ["Auth"],
              summary: "Change password",
              security: [{ BearerAuth: [] }],
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["old_password","new_password"], properties: {
                  old_password: { type: "string" },
                  new_password: { type: "string", minLength: 6 }
                }}}}
              },
              responses: {
                "200": { description: "Password changed successfully" },
                "400": { description: "Incorrect current password or validation error" }
              }
            }
          },
          "/orders": {
            post: {
              tags: ["Orders"],
              summary: "Place a new delivery order",
              security: [{ BearerAuth: [] }],
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["pickup_name","pickup_phone","pickup_address","delivery_name","delivery_phone","delivery_address","payment_method"], properties: {
                  pickup_name: { type: "string", example: "Sender Name" },
                  pickup_phone: { type: "string", example: "01712345678" },
                  pickup_address: { type: "string", example: "123 Dhanmondi, Dhaka" },
                  delivery_name: { type: "string", example: "Recipient Name" },
                  delivery_phone: { type: "string", example: "01898765432" },
                  delivery_address: { type: "string", example: "456 Gulshan, Dhaka" },
                  payment_method: { type: "string", enum: ["CASH_ON_DELIVERY","BKASH","CARD"], example: "CASH_ON_DELIVERY" },
                  notes: { type: "string", example: "Fragile package" }
                }}}}
              },
              responses: {
                "201": { description: "Order created successfully with tracking number and fee in ৳ (BDT)" },
                "400": { description: "Validation error" }
              }
            },
            get: {
              tags: ["Orders"],
              summary: "List current customer's orders",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                { name: "status", in: "query", schema: { type: "string", enum: ["PENDING","CONFIRMED","PROCESSING","OUT_FOR_DELIVERY","DELIVERED","RETURNED","CANCELLED"] } }
              ],
              responses: {
                "200": { description: "Paginated list of customer orders" }
              }
            }
          },
          "/orders/{id}": {
            get: {
              tags: ["Orders"],
              summary: "Get order details by ID",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
              ],
              responses: {
                "200": { description: "Full order details with payment, status history" },
                "404": { description: "Order not found" }
              }
            },
            delete: {
              tags: ["Orders"],
              summary: "Cancel a pending order",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
              ],
              responses: {
                "200": { description: "Order cancelled successfully" },
                "400": { description: "Order cannot be cancelled (not in PENDING status)" }
              }
            }
          },
          "/addresses": {
            post: {
              tags: ["Addresses"],
              summary: "Save a new address",
              security: [{ BearerAuth: [] }],
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["title","contact_name","contact_phone","address_line","city"], properties: {
                  title: { type: "string", example: "Home" },
                  contact_name: { type: "string", example: "Mehedi" },
                  contact_phone: { type: "string", example: "01712345678" },
                  address_line: { type: "string", example: "House 12, Road 5, Dhanmondi" },
                  city: { type: "string", example: "Dhaka" },
                  postal_code: { type: "string", example: "1205" }
                }}}}
              },
              responses: {
                "201": { description: "Address created" },
                "400": { description: "Validation error" }
              }
            },
            get: {
              tags: ["Addresses"],
              summary: "List all saved addresses",
              security: [{ BearerAuth: [] }],
              responses: {
                "200": { description: "Array of saved addresses" }
              }
            }
          },
          "/addresses/{id}": {
            put: {
              tags: ["Addresses"],
              summary: "Update an existing address",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
              ],
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["title","contact_name","contact_phone","address_line","city"], properties: {
                  title: { type: "string" },
                  contact_name: { type: "string" },
                  contact_phone: { type: "string" },
                  address_line: { type: "string" },
                  city: { type: "string" },
                  postal_code: { type: "string" }
                }}}}
              },
              responses: {
                "200": { description: "Address updated" },
                "400": { description: "Validation error or unauthorized" }
              }
            },
            delete: {
              tags: ["Addresses"],
              summary: "Delete an address",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
              ],
              responses: {
                "200": { description: "Address deleted" },
                "400": { description: "Not found or unauthorized" }
              }
            }
          },
          "/admin/dashboard": {
            get: {
              tags: ["Admin"],
              summary: "Get admin dashboard statistics",
              security: [{ BearerAuth: [] }],
              description: "Returns total orders, active orders, delivered orders, total customers, and total revenue (in ৳ BDT). Requires SUPER_ADMIN or ADMIN role.",
              responses: {
                "200": { description: "Dashboard stats object" },
                "403": { description: "Forbidden — admin role required" }
              }
            }
          },
          "/admin/orders": {
            get: {
              tags: ["Admin"],
              summary: "List all orders (admin view)",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                { name: "status", in: "query", schema: { type: "string" } },
                { name: "search", in: "query", schema: { type: "string" } }
              ],
              responses: {
                "200": { description: "Paginated list of all orders" }
              }
            }
          },
          "/admin/orders/{id}/status": {
            put: {
              tags: ["Admin"],
              summary: "Update order status",
              security: [{ BearerAuth: [] }],
              description: "Transitions an order to a new status. Valid transitions: PENDING→CONFIRMED/CANCELLED, CONFIRMED→PROCESSING/CANCELLED, PROCESSING→OUT_FOR_DELIVERY/CANCELLED, OUT_FOR_DELIVERY→DELIVERED/RETURNED.",
              parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
              ],
              requestBody: {
                required: true,
                content: { "application/json": { schema: { type: "object", required: ["status"], properties: {
                  status: { type: "string", enum: ["CONFIRMED","PROCESSING","OUT_FOR_DELIVERY","DELIVERED","RETURNED","CANCELLED"] },
                  notes: { type: "string", example: "Verified and confirmed by admin" }
                }}}}
              },
              responses: {
                "200": { description: "Order status updated. Payment auto-completed on DELIVERED, auto-failed on CANCELLED." },
                "400": { description: "Invalid status transition" }
              }
            }
          },
          "/admin/users": {
            get: {
              tags: ["Admin"],
              summary: "List all users",
              security: [{ BearerAuth: [] }],
              parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                { name: "search", in: "query", schema: { type: "string" } }
              ],
              responses: {
                "200": { description: "Paginated list of users" }
              }
            }
          }
        },
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "Enter your JWT access token obtained from /auth/login"
            }
          }
        }
      },
      dom_id: "#swagger-ui",
      deepLinking: true,
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`
