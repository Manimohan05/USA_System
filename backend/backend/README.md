# 🏫 USA Attendance System - Backend API

A robust, secure REST API for managing student attendance, built with **Spring Boot 3**, **PostgreSQL**, and **JWT authentication**. Features comprehensive student management, attendance tracking, and SMS notifications.

## ✨ Features

### 🔐 **Authentication & Security**

- **JWT-based authentication** with secure token management
- **Role-based access control** (Admin, Teacher, Student)
- **Password encryption** with BCrypt
- **CORS configuration** for cross-origin requests
- **Request validation** with comprehensive error handling

### 👥 **Student Management**

- **CRUD operations** for student records
- **Bulk CSV import** with validation and error reporting
- **Auto-generated Student IDs** with customizable format
- **Index number management** for academic tracking
- **Parent and student contact information**

### 📊 **Attendance System**

- **Mark attendance** for individual students or entire batches
- **Attendance history** with date range queries
- **Attendance statistics** and reporting
- **SMS notifications** to parents via Twilio integration
- **Flexible attendance states** (Present, Absent, Late, Excused)

### 🎓 **Academic Management**

- **Batch management** with year-wise organization
- **Subject management** with teacher assignments
- **Student-subject enrollment** tracking
- **Fee management** and payment records
- **Messaging system** for announcements

### 📱 **Communication**

- **Twilio SMS integration** for parent notifications
- **Configurable message templates** for different events
- **Bulk messaging** capabilities
- **Message history** and delivery tracking

## 🚀 Quick Start

### Prerequisites

- **Java 21+** (OpenJDK or Oracle JDK)
- **Maven 3.8+** for dependency management
- **PostgreSQL 13+** database server
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Dinu-14/USA-Attendance-system-NEW-.git
   cd USA-Attendance-system-NEW-/backend/backend
   ```

2. **Database Setup**

   **Install PostgreSQL:**

   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Create a database named `institute_db`

   ```sql
   -- Connect to PostgreSQL as superuser
   CREATE DATABASE institute_db;
   CREATE USER attendance_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE institute_db TO attendance_user;
   ```

3. **Environment Configuration**

   Create a `.env` file in the backend root or set environment variables:

   ```env
   # Database Configuration
   DB_URL=jdbc:postgresql://localhost:5432/institute_db
   DB_USERNAME=postgres
   DB_PASSWORD=your_database_password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-at-least-256-bits-long
   JWT_EXPIRATION=86400000

   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number

   # Application Configuration
   SPRING_PROFILES_ACTIVE=dev
   SERVER_PORT=8080
   ```

4. **Update application.properties**

   Modify `src/main/resources/application.properties`:

   ```properties
   # Database Configuration
   spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/institute_db}
   spring.datasource.username=${DB_USERNAME:postgres}
   spring.datasource.password=${DB_PASSWORD:your_password}

   # Twilio Configuration
   twilio.account.sid=${TWILIO_ACCOUNT_SID}
   twilio.auth.token=${TWILIO_AUTH_TOKEN}
   twilio.phone.number=${TWILIO_PHONE_NUMBER}

   # JWT Configuration
   jwt.secret=${JWT_SECRET:your-secret-key}
   jwt.expiration=${JWT_EXPIRATION:86400000}
   ```

5. **Install Dependencies**

   ```bash
   mvn clean install
   ```

6. **Run Database Migrations**

   ```bash
   # Flyway migrations will run automatically on startup
   mvn flyway:migrate
   ```

7. **Start the Application**

   ```bash
   mvn spring-boot:run
   ```

8. **Verify Installation**
   - API will be available at: `http://localhost:8080/api`
   - Health check: `GET http://localhost:8080/api/health`

## 📁 Project Structure

```
backend/backend/
├── src/
│   ├── main/
│   │   ├── java/com/usa/attendancesystem/
│   │   │   ├── config/              # Configuration classes
│   │   │   │   ├── SecurityConfig.java    # Spring Security configuration
│   │   │   │   ├── CorsConfig.java        # CORS configuration
│   │   │   │   └── JwtConfig.java         # JWT configuration
│   │   │   ├── controller/          # REST API endpoints
│   │   │   │   ├── AuthController.java    # Authentication endpoints
│   │   │   │   ├── StudentController.java # Student management
│   │   │   │   ├── AttendanceController.java # Attendance tracking
│   │   │   │   ├── BatchController.java   # Batch management
│   │   │   │   └── SubjectController.java # Subject management
│   │   │   ├── dto/                 # Data Transfer Objects
│   │   │   │   ├── StudentDto.java        # Student data transfer
│   │   │   │   ├── AttendanceDto.java     # Attendance data
│   │   │   │   └── AuthRequest.java       # Authentication requests
│   │   │   ├── exception/           # Exception handling
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── CustomExceptions.java
│   │   │   ├── model/               # JPA Entity classes
│   │   │   │   ├── Student.java           # Student entity
│   │   │   │   ├── Attendance.java        # Attendance entity
│   │   │   │   ├── Batch.java             # Batch entity
│   │   │   │   ├── Subject.java           # Subject entity
│   │   │   │   └── User.java              # User entity
│   │   │   ├── repository/          # JPA Repositories
│   │   │   │   ├── StudentRepository.java
│   │   │   │   ├── AttendanceRepository.java
│   │   │   │   └── BatchRepository.java
│   │   │   └── service/             # Business logic layer
│   │   │       ├── StudentService.java    # Student business logic
│   │   │       ├── AttendanceService.java # Attendance logic
│   │   │       ├── TwilioSmsService.java  # SMS notifications
│   │   │       └── AuthService.java       # Authentication logic
│   │   └── resources/
│   │       ├── application.properties     # Main configuration
│   │       └── db/migration/             # Flyway SQL migrations
│   │           ├── V1__Initial_Schema.sql
│   │           └── V2__Add_Index_Numbers_And_Sessions.sql
│   └── test/                        # Unit and integration tests
├── pom.xml                          # Maven dependencies
└── README.md                        # This file
```

## 🛠️ Technology Stack

### **Core Framework**

- **Spring Boot 3.5.7** - Enterprise Java framework
- **Spring Security 6** - Authentication and authorization
- **Spring Data JPA** - Database abstraction layer
- **Hibernate 6** - ORM framework

### **Database & Persistence**

- **PostgreSQL 13+** - Primary database
- **Flyway** - Database version control and migrations
- **HikariCP** - High-performance connection pooling

### **Security & Authentication**

- **JWT (JSON Web Tokens)** - Stateless authentication
- **BCrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### **Communication & Integration**

- **Twilio SDK** - SMS notifications
- **Apache Commons CSV** - CSV file processing
- **Apache POI** - Excel file handling

### **Development & Testing**

- **Maven 3.8+** - Dependency management and build tool
- **JUnit 5** - Unit testing framework
- **Mockito** - Mocking framework for tests
- **Spring Boot Test** - Integration testing

### **Validation & Processing**

- **Bean Validation (JSR-380)** - Input validation
- **Jackson** - JSON serialization/deserialization
- **Lombok** - Code generation for boilerplate reduction

## 🌐 API Documentation

### **Base URL**

```
http://localhost:8080/api
```

### **Authentication Endpoints**

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

### **Student Management**

```http
# Get all students
GET /admin/students
Authorization: Bearer {jwt_token}

# Create new student
POST /admin/students
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "studentIdCode": "STU001",
  "fullName": "John Doe",
  "indexNumber": "IDX001",
  "parentPhone": "0771234567",
  "studentPhone": "0762345678",
  "batchId": 1,
  "subjectIds": [1, 2, 3]
}

# Bulk import students
POST /admin/students/bulk-import
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

file: students.csv
```

### **Attendance Management**

```http
# Mark attendance
POST /admin/attendance/mark
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "studentId": "uuid",
  "subjectId": 1,
  "attendanceDate": "2024-12-11",
  "status": "PRESENT"
}

# Get attendance report
GET /admin/attendance/report?studentId={uuid}&startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer {jwt_token}
```

### **Batch & Subject Management**

```http
# Get all batches
GET /admin/institute/batches
Authorization: Bearer {jwt_token}

# Get all subjects
GET /admin/institute/subjects
Authorization: Bearer {jwt_token}
```

## 🗄️ Database Schema

### **Key Tables**

- `students` - Student information and enrollment data
- `batches` - Academic batch/year information
- `subjects` - Course subjects and details
- `student_subjects` - Many-to-many relationship for enrollments
- `attendance_records` - Individual attendance entries
- `users` - System user accounts and authentication
- `flyway_schema_history` - Database migration tracking

### **Sample Data**

The application includes seed data for testing:

- Default admin user: `admin` / `password`
- Sample batches for current and previous years
- Common subjects (Mathematics, Physics, Chemistry, etc.)

## 🚀 Deployment

### **Production Configuration**

1. **Environment Variables**

   ```bash
   export DB_URL="jdbc:postgresql://production-db:5432/institute_db"
   export DB_USERNAME="prod_user"
   export DB_PASSWORD="secure_production_password"
   export JWT_SECRET="super-secure-production-jwt-secret-key"
   export TWILIO_ACCOUNT_SID="production_twilio_sid"
   export TWILIO_AUTH_TOKEN="production_twilio_token"
   ```

2. **Build for Production**

   ```bash
   mvn clean package -Dmaven.test.skip=true
   ```

3. **Run Production JAR**
   ```bash
   java -jar target/attendancesystem-0.0.1-SNAPSHOT.jar
   ```

### **Docker Deployment**

```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app
COPY target/attendancesystem-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
docker build -t attendance-system-backend .
docker run -p 8080:8080 --env-file .env attendance-system-backend
```

## 🧪 Testing

### **Run Tests**

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=StudentServiceTest

# Run with coverage
mvn test jacoco:report
```

### **Test Categories**

- **Unit Tests** - Service layer business logic
- **Integration Tests** - Repository and database operations
- **Controller Tests** - API endpoint validation
- **Security Tests** - Authentication and authorization

## 📊 Monitoring & Logging

### **Application Monitoring**

- **Spring Boot Actuator** endpoints for health checks
- **Application logs** in configurable formats
- **Database connection monitoring** via HikariCP metrics

### **Log Configuration**

```properties
# Logging levels
logging.level.org.springframework.security=DEBUG
logging.level.com.usa.attendancesystem=INFO
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

## 🔧 Configuration Options

### **Database Configuration**

```properties
# Connection pool settings
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000

# JPA settings
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true
```

### **Security Configuration**

```properties
# JWT settings
jwt.secret=${JWT_SECRET:fallback-secret-key}
jwt.expiration=${JWT_EXPIRATION:86400000}

# CORS settings
cors.allowed.origins=http://localhost:3000,https://yourdomain.com
cors.allowed.methods=GET,POST,PUT,DELETE,OPTIONS
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards**:
   - Use Java naming conventions
   - Write comprehensive tests
   - Document public methods
   - Follow Spring Boot best practices
4. **Commit changes** (`git commit -m 'Add amazing feature'`)
5. **Push to branch** (`git push origin feature/amazing-feature`)
6. **Open Pull Request**

### **Code Style Guidelines**

- **Java 21 features** - Use records, switch expressions, text blocks
- **Spring annotations** - Prefer `@RestController`, `@Service`, `@Repository`
- **Error handling** - Use `@ControllerAdvice` for global exception handling
- **Validation** - Use Bean Validation annotations (`@Valid`, `@NotNull`, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### **Common Issues**

**Database Connection Failed**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
# or on Windows
net start postgresql-x64-13

# Verify connection
psql -U postgres -h localhost -d institute_db
```

**JWT Authentication Issues**

- Check JWT secret is properly configured
- Verify token expiration settings
- Ensure CORS is configured for your frontend domain

**Flyway Migration Errors**

```bash
# Reset migrations (DANGER: Drops all data)
mvn flyway:clean flyway:migrate

# Check migration status
mvn flyway:info
```

**Twilio SMS Not Working**

- Verify Twilio credentials in environment variables
- Check Twilio account balance and phone number verification
- Review SMS delivery logs in Twilio console

**Build Failures**

```bash
# Clean and rebuild
mvn clean compile

# Skip tests if needed
mvn clean install -DskipTests
```

### **Performance Optimization**

- Enable database connection pooling
- Configure appropriate JVM heap size
- Use database indexes for frequently queried fields
- Enable Spring Boot caching for reference data

### **Getting Help**

- Check the [Issues](https://github.com/Dinu-14/USA-Attendance-system-NEW-/issues) page
- Review application logs in `logs/` directory
- Enable debug logging for troubleshooting
- Contact the development team

---

**Built with ❤️ by the USA Institute Development Team**
