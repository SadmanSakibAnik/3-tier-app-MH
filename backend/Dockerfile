# Build stage
FROM golang:1.22-alpine AS builder

# Install ca-certificates and git (required for downloading dependencies)
RUN apk update && apk add --no-cache ca-certificates git

WORKDIR /app

# Copy go.mod first
COPY go.mod ./

# Copy all source code
COPY . .

# Generate go.sum and download all dependencies
RUN go mod tidy

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/api-service ./cmd/api/main.go

# Production stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/api-service /app/api-service

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/app/api-service"]
