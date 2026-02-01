# USA Attendance System - AI Coding Instructions

## Architecture Overview

**Two-tier application**: Spring Boot 3 REST API (Java 21, PostgreSQL) + Next.js 16 frontend (React 19, TypeScript).

- **Backend**: `backend/backend/` - Maven project with Flyway migrations
- **Frontend**: `frontend/` - Next.js app with App Router pattern
- **API Communication**: Axios client with JWT interceptors, base URL: `/api`

## Core Domain Model

**Students** (`UUID` primary keys) belong to **Batches** (academic years) and enroll in multiple **Subjects**. The system tracks **Attendance** via **Sessions** that can be created, paused, closed, and reactivated with SMS notifications to parents.

Key entities:
- `Student` → has `studentIdCode`, `indexNumber` (auto-generated), enrolls in subjects
- `Batch` → represents academic year (e.g., "2024", "2025")  
- `AttendanceSession` → tracks active attendance marking periods
- Attendance marked by **Student ID Code** or **Index Number**

## Backend Patterns

### Controllers & Security
```java
@RestController
@RequestMapping("/admin/students")  // Most endpoints require /admin prefix
@RequiredArgsConstructor           // Lombok pattern used throughout
```

**Security routing**:
- `/admin/*` → JWT authenticated endpoints
- `/attendance/sessions/{id}/status` → Public endpoint for real-time status
- `/debug/*` → Development/troubleshooting endpoints

### Service Architecture
- Controllers delegate to `@Service` classes (e.g., `StudentService`, `AttendanceService`)
- Database access via Spring Data JPA repositories
- **Flyway migrations**: `src/main/resources/db/migration/V{n}__{Description}.sql`

### Configuration
- `application.properties`: `spring.jpa.hibernate.ddl-auto=validate` (Flyway manages schema)
- CORS configured for `localhost:3000` in `CorsConfig`
- SMS service toggles between Twilio (real) and Mock via `twilio.enabled` property

## Frontend Patterns

### App Router Structure
```
src/app/
├── dashboard/           # Protected admin routes
│   ├── students/       # CRUD + bulk import
│   ├── attendance/     # Session management + marking
│   └── [other modules]
└── login/              # Public auth route
```

### State Management
- **Authentication**: Context provider with localStorage JWT persistence
- **API Client**: `src/lib/api.ts` - Axios with automatic JWT injection
- **Protected Routes**: Wrap all admin pages with `<ProtectedRoute>`

### Component Patterns
```tsx
// Standard page structure
<ProtectedRoute>
  <DashboardLayout>
    {/* Page content */}
  </DashboardLayout>
</ProtectedRoute>
```

### Type System
- Centralized types in `src/types/` with barrel exports
- DTO classes match backend exactly (e.g., `StudentDto`, `AttendanceSessionDto`)
- API client typed with generics: `api.get<StudentDto[]>('/admin/students')`

## Key Workflows

### Student Import (CSV)
1. Frontend uploads CSV to `/admin/students/import-csv`
2. Backend validates, creates students with auto-generated index numbers
3. Returns `CsvImportResultDto` with success/error details

### Attendance Sessions
1. Create session: `POST /admin/attendance/sessions` → generates QR code
2. Mark attendance: `POST /attendance/mark-by-index` (public endpoint)
3. Monitor progress: `GET /attendance/sessions/{id}/status` 
4. End session: Triggers SMS notifications to absent student parents

### SMS Integration
- **Development**: Mock service logs to console
- **Production**: Twilio integration via `twilio.enabled=true`
- Parent notifications for absences automatically sent on session end

## Development Commands

**Backend** (from `backend/backend/`):
```bash
./mvnw spring-boot:run                    # Start on :8080
./mvnw flyway:migrate                     # Run database migrations
```

**Frontend** (from `frontend/`):
```bash
npm run dev                               # Start on :3000
npm run build                             # Production build
```

## Critical Files
- `backend/backend/src/main/resources/application.properties` → Database + feature toggles
- `frontend/src/lib/api.ts` → HTTP client configuration
- `frontend/src/contexts/auth.tsx` → Authentication state management
- `backend/backend/src/main/resources/db/migration/` → Database schema evolution

## Debugging Notes
- Backend has extensive `/debug/*` endpoints for troubleshooting
- Frontend API client logs all requests/responses to console
- Use `SessionAttendanceStatusDto` for real-time attendance progress tracking
- Student lookup supports both Student ID Code and Index Number formats