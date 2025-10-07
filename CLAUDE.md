# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application for "Captus" - a plant e-commerce platform. The system handles user authentication, product catalog (plants/floors), orders, payments via Vexor (MercadoPago integration), and PDF report generation.

## Development Commands

### Build and Run
- **Build**: `npm run build`
- **Start dev**: `npm run start:dev` (with hot reload)
- **Start debug**: `npm run start:debug` (debug mode with hot reload)
- **Start production**: `npm run start:prod`

### Testing
- **Run all tests**: `npm run test`
- **Watch mode**: `npm run test:watch`
- **Coverage**: `npm run test:cov`
- **E2E tests**: `npm run test:e2e`

### Code Quality
- **Lint**: `npm run lint` (auto-fixes)
- **Format**: `npm run format` (Prettier)

### Database Migrations
- **Run migrations**: `npm run migration:run`
- **Revert migration**: `npm run migration:revert`
- **Generate migration**: `npm run migration:generate`

Note: Migrations use TypeORM CLI with [data-source.ts](src/data-source.ts) configuration.

## Architecture

### Module Structure

The application follows NestJS module-based architecture with the following main modules:

1. **AuthModule** ([src/auth](src/auth/)) - JWT-based authentication
   - Uses bcrypt for password hashing
   - JWT secret defined in auth.service.ts (`super-secret-jwt`)
   - Includes role-based guards (`@Roles()` decorator) and JWT strategy
   - Custom roles guard checks user permissions

2. **UsersModule** ([src/users](src/users/)) - User management
   - User entity with roles (enum: USER, ADMIN)
   - Manages user favorites (Favorito entity)
   - Relations: User -> Orders, User -> Favoritos

3. **FloorsModule** ([src/floors](src/floors/)) - Product catalog
   - Manages plants (Floor entity) with categories (enum)
   - Supports offers (Oferta) and combos (Combo/ComboItem)
   - Each plant has pricing, stock, images (stored in Vercel Blob)

4. **OrderModule** ([src/order](src/order/)) - Order creation and management
   - Creates orders with multiple items (Orden + OrdenItem entities)
   - Calculates totals and manages order states (enum: PENDIENTE, PAGADO, CANCELADO)
   - Integrates with PrintService for PDF generation

5. **PaymentsModule** ([src/payments](src/payments/)) - Payment processing
   - Vexor SDK integration for MercadoPago payments
   - Webhook handler for payment status updates
   - Updates order status and decrements stock when payment confirmed
   - Payment states: PENDIENTE, CONFIRMADO, RECHAZADO

6. **ReportsModule** ([src/reports](src/reports/)) - Report generation

7. **PrintModule** ([src/print](src/print/)) - PDF generation using pdfmake
   - Order templates in [src/print/templates](src/print/templates/)

8. **MailModule** ([src/mailer](src/mailer/)) - Email notifications

### Database Configuration

- **ORM**: TypeORM with PostgreSQL
- **Connection**: Configured in [app.module.ts](src/app.module.ts) using environment variables
- **Entities**: Auto-loaded with `autoLoadEntities: true`
- **Synchronize**: Currently `true` (auto-sync schema - should be `false` in production)
- **Migration DataSource**: Separate configuration in [data-source.ts](src/data-source.ts) for CLI operations

### Environment Configuration

Environment variables are validated using Joi schema in [src/config/envs.ts](src/config/envs.ts).

Required variables:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `VEXOR_PROJECT`, `VEXOR_PUBLISHABLE_KEY`, `VEXOR_SECRET_KEY` - Payment processor
- `PAYMENT_SUCCESS_URL`, `PAYMENT_FAILURE_URL`, `PAYMENT_PENDING_URL` - Payment redirects

### Global Configuration

The application includes several global configurations in [main.ts](src/main.ts):

1. **Global Validation Pipe**: Automatically validates DTOs using class-validator
   - `transform: true` - Auto-transform payloads to DTO instances
   - `whitelist: true` - Strip non-whitelisted properties
   - `forbidNonWhitelisted: false` - Don't throw on extra properties

2. **Global Exception Filter**: Custom filter ([AllExceptionsFilter](src/utils/exeptionFilter.ts))
   - Standardized error response format with `code` and `status`
   - Handles validation errors separately (returns array of errors)
   - All errors returned as `{ code: string, status: number, message?: string, errors?: any[] }`

3. **CORS**: Enabled globally with `app.enableCors()`

### Error Handling Pattern

All services follow consistent error handling:

```typescript
try {
  // business logic
} catch (error) {
  if (error instanceof HttpException) throw error;

  throw new HttpException(
    { code: 'ERROR_CODE', status: HttpStatus.X, message: '...' },
    HttpStatus.X
  );
}
```

Common error codes: `USER_NOT_FOUND`, `PLANT_NOT_FOUND`, `ORDER_NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED_USER`, etc.

### Entity Relationships

Key relationships:
- User 1:N Orden (orders)
- User 1:N Favorito
- Orden 1:N OrdenItem
- Orden 1:1 Pago (payment)
- Floor 1:N OrdenItem
- Floor N:1 Oferta (optional)
- Floor 1:N ComboItem
- Floor 1:N Favorito
- Combo 1:N ComboItem

### Payment Flow

1. User creates order via OrderService
2. OrderService returns OrderWithItems
3. PaymentsService.createPayment() creates Vexor payment link
4. User completes payment on MercadoPago
5. Webhook calls PaymentsService.handleWebhook()
6. On payment confirmation:
   - Updates Pago status to CONFIRMADO
   - Updates Orden status to PAGADO
   - Decrements Floor stock for each item

### TypeScript Configuration

- **Target**: ES2023
- **Decorators**: Enabled (required for NestJS)
- **Strict null checks**: Enabled
- **Base URL**: `./` (allows imports like `src/...`)
- **Output**: `dist/` directory

## Code Conventions

- Use class-validator decorators for DTO validation
- All entity enums stored in `[module]/enums/` folders
- DTOs stored in `[module]/dtos/` folders
- Services handle business logic and error handling
- Controllers are thin - delegate to services
- Use TypeORM repositories with `@InjectRepository()`
