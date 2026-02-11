# USA Attendance Management System

A comprehensive institute attendance management system built with Next.js (frontend) and Spring Boot (backend).

## 🚀 Project Overview

This system helps educational institutes manage:

- **Student Management**: Add, edit, and organize students by batches and subjects
- **Attendance Tracking**: Real-time attendance marking with parent notifications
- **Institute Management**: Manage batches (academic years) and subjects
- **Parent Communication**: Send broadcast messages and fee reminders
- **Fee Management**: Track student fees and payment status

## 📋 Features

### Core Functionality

- ✅ **Authentication System** - Secure admin login with JWT tokens
- ✅ **Student Management** - CRUD operations with batch and subject filtering
- ✅ **Attendance System** - Student ID validation and real-time marking
- ✅ **Reporting** - Daily attendance reports with CSV export
- ✅ **Messaging** - Parent notifications for attendance and fee reminders
- ✅ **Fee Tracking** - Payment management and overdue tracking

### User Interface

- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean, professional interface with Tailwind CSS
- 🚀 **Fast Performance** - Optimized with Next.js and TypeScript

## 🔧 Environment Setup

### Required Environment Variables

This application requires environment variables for sensitive configuration. **Never commit secrets to version control.**

1. **Copy the example environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables in `.env`:**

   ```bash
   # Database Configuration
   DB_URL=jdbc:postgresql://localhost:5432/institute_db
   DB_USERNAME=postgres
   DB_PASSWORD=your_actual_password

   # JWT Secret (Generate a long, random string)
   JWT_SECRET=your_super_long_jwt_secret_key_here

   # Twilio SMS Configuration (Optional - Leave empty to use Mock SMS)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_FROM_NUMBER=your_twilio_phone_number
   TWILIO_ENABLED=true
   TWILIO_TEST_MODE=false
   ```

3. **Important Security Notes:**
   - Never share your `.env` file
   - Use different secrets for development and production
   - Generate strong, unique JWT secrets
   - The `.env` file is automatically ignored by Git

### SMS Configuration Options

**Option 1: Mock SMS (Development)**

- Leave Twilio variables empty or set `TWILIO_ENABLED=false`
- SMS messages will be logged to console only

**Option 2: Real SMS (Production)**

- Sign up for Twilio account
- Get your Account SID, Auth Token, and phone number
- Configure the Twilio environment variables
- 🔒 **Secure** - Protected routes and API authentication

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** - React framework with app router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Axios** - API communication
- **Lucide React** - Icon library

### Backend

- **Spring Boot** - Java web framework
- **Spring Security** - Authentication and authorization
- **PostgreSQL** - Database
- **Flyway** - Database migrations
- **JWT** - Token-based authentication

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Java 17+
- PostgreSQL database

### 🐘 PostgreSQL & pgAdmin Setup Guide

Before running the application, you need to set up PostgreSQL database and optionally pgAdmin for database management.

#### **Step 1: Install PostgreSQL**

##### **Windows Installation**

1. **Download PostgreSQL:**

   - Visit: https://www.postgresql.org/download/windows/
   - Download the latest stable version (recommended: PostgreSQL 15 or higher)

2. **Run the Installer:**

   - Run the downloaded `.exe` file as Administrator
   - Follow the installation wizard:
     - **Installation Directory:** Use default (`C:\Program Files\PostgreSQL\15`)
     - **Data Directory:** Use default (`C:\Program Files\PostgreSQL\15\data`)
     - **Password:** Set a secure password for the `postgres` user (remember this!)
     - **Port:** Use default `5432`
     - **Locale:** Use default

3. **Complete Installation:**
   - Uncheck "Launch Stack Builder" at the end
   - Click "Finish"

##### **macOS Installation**

```bash
# Using Homebrew (recommended)
brew install postgresql@15
brew services start postgresql@15

# Or download from: https://www.postgresql.org/download/macosx/
```

##### **Linux (Ubuntu/Debian) Installation**

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create database
sudo -u postgres psql
```

#### **Step 2: Create Database and User**

1. **Open PostgreSQL Command Line:**

   - **Windows:** Search for "SQL Shell (psql)" in Start Menu
   - **macOS/Linux:** Open terminal and run `psql -U postgres`

2. **Create the Database:**

   ```sql
   -- Connect as postgres user
   CREATE DATABASE institute_db;

   -- Create a dedicated user (optional but recommended)
   CREATE USER attendance_user WITH PASSWORD 'secure_password_here';

   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE institute_db TO attendance_user;

   -- Exit psql
   \q
   ```

3. **Test Connection:**

   ```bash
   # Test with new user
   psql -U attendance_user -d institute_db -h localhost

   # Or test with default postgres user
   psql -U postgres -d institute_db -h localhost
   ```

#### **Step 3: Install pgAdmin (Optional but Recommended)**

pgAdmin is a web-based database administration tool for PostgreSQL.

##### **Windows Installation**
 helping guide youtube link = https://youtu.be/4qH-7w5LZsA?si=hN8hakY8faChuMrM
1. **Download pgAdmin:**

   - Visit: https://www.pgadmin.org/download/pgadmin-4-windows/
   - Download the latest version

2. **Install pgAdmin:**

   - Run the installer and follow the wizard
   - Use default settings

3. **Launch pgAdmin:**
   - Open pgAdmin from Start Menu or desktop shortcut
   - It will open in your web browser (usually at http://127.0.0.1:PORT)

##### **macOS Installation**

```bash
# Using Homebrew Cask
brew install --cask pgadmin4

# Or download from: https://www.pgadmin.org/download/pgadmin-4-macos/
```

##### **Linux Installation**

```bash
# Ubuntu/Debian
sudo apt install pgadmin4

# Or install via Snap
sudo snap install pgadmin4
```

#### **Step 4: Configure pgAdmin Connection**

1. **Open pgAdmin** (it runs as a web application)

2. **Add New Server:**

   - Right-click "Servers" in the left panel
   - Select "Register" → "Server"

3. **Configure Connection:**

   ```
   General Tab:
   - Name: USA Attendance System

   Connection Tab:
   - Host name/address: localhost
   - Port: 5432
   - Maintenance database: postgres
   - Username: postgres (or your custom user)
   - Password: [your postgres password]
   ```

4. **Save Connection:**

   - Click "Save"
   - You should see your server appear in the left panel

5. **Verify Database:**
   - Expand your server → Databases
   - You should see "institute_db" listed

#### **Step 5: Configure Application Properties**

Update your `backend/backend/src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/institute_db
spring.datasource.username=postgres
# OR if you created a custom user: attendance_user
spring.datasource.password=your_actual_password_here
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA & Hibernate Configuration
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Flyway Database Migration
spring.flyway.enabled=true
```

#### **Step 6: Verify Setup**

1. **Test Database Connection:**

   ```bash
   # In psql command line
   psql -U postgres -d institute_db -h localhost -c "SELECT version();"
   ```

2. **Check if Application Can Connect:**
   - Start your Spring Boot application
   - Look for successful database connection logs
   - Flyway should automatically create the required tables

#### **Common Troubleshooting**

##### **Connection Issues**

```bash
# Check if PostgreSQL is running
# Windows:
net start postgresql-x64-15

# macOS:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql
```

##### **Permission Issues**

```sql
-- If you get permission errors, grant additional privileges:
-- Connect as postgres user first
\c institute_db postgres

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE institute_db TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

##### **Port Already in Use**

```bash
# Check what's using port 5432
netstat -an | findstr :5432

# Change PostgreSQL port in postgresql.conf if needed
```

#### **Database Management Tips**

1. **Using pgAdmin:**

   - Browse tables: Server → Database → Schemas → public → Tables
   - Run queries: Tools → Query Tool
   - View data: Right-click table → View/Edit Data

2. **Useful SQL Commands:**

   ```sql
   -- List all tables
   \dt

   -- View table structure
   \d table_name

   -- Check database size
   SELECT pg_size_pretty(pg_database_size('institute_db'));

   -- View active connections
   SELECT * FROM pg_stat_activity WHERE datname = 'institute_db';
   ```

3. **Backup and Restore:**

   ```bash
   # Create backup
   pg_dump -U postgres -h localhost institute_db > backup.sql

   # Restore backup
   psql -U postgres -h localhost institute_db < backup.sql
   ```

**✅ Setup Complete!** Your PostgreSQL database is now ready for the USA Attendance System.

### Backend Setup

1. Navigate to backend directory:

   ```bash
   cd backend/backend
   ```

2. Configure database in `application.properties`:

   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/attendance_db
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   ```

3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```

### Frontend Setup

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## 📱 Usage Guide

### Initial Setup

1. **Login**: Use admin credentials (Username: "USA Admin", Password: "USA29#12MSK") to access the dashboard
2. **Create Batches**: Add academic year batches (e.g., 2024, 2025)
3. **Add Subjects**: Create subjects like Chemistry, Physics, Biology
4. **Add Students**: Register students with their batch and subject selections

### Daily Operations

1. **Mark Attendance**:

   - Select batch and subject for the class
   - Students enter their ID codes to mark present
   - Parents receive automatic SMS notifications

2. **View Reports**:

   - Generate daily attendance reports
   - Download CSV files for record keeping
   - View present/absent student lists

3. **Send Messages**:
   - Broadcast important announcements
   - Send automated fee payment reminders
   - Target specific batches or subjects

### Fee Management

1. **Create Fee Records**: Add tuition fees with due dates
2. **Track Payments**: Monitor paid/pending amounts
3. **Send Reminders**: Automated notifications for overdue payments

## 🔧 API Documentation

### Authentication

```
POST /api/auth/login
Body: { "username": "USA Admin", "password": "USA29#12MSK" }
Response: { "token": "jwt_token_here" }
```

### Key Endpoints

- `GET /api/admin/students` - List students with filters
- `POST /api/admin/students` - Create new student
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/admin/attendance/report` - Generate reports
- `POST /api/admin/messaging/broadcast` - Send messages

## 📂 Project Structure

```
USA-Attendance-system-NEW-/
├── backend/
│   ├── src/main/java/com/usa/attendancesystem/
│   │   ├── controller/     # REST API controllers
│   │   ├── service/        # Business logic
│   │   ├── repository/     # Data access layer
│   │   ├── model/          # JPA entities
│   │   └── dto/           # Data transfer objects
│   └── src/main/resources/
│       ├── application.properties
│       └── db/migration/   # Database migrations
│
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (auth)
│   │   ├── lib/          # Utilities and API client
│   │   └── types/        # TypeScript interfaces
│   └── public/           # Static assets
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based login system
- **Protected Routes**: Frontend route protection for admin pages
- **API Security**: Backend endpoints secured with Spring Security
- **Input Validation**: Client and server-side data validation
- **CORS Configuration**: Proper cross-origin request handling

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
```

### Backend (Production Server)

```bash
./mvnw clean package
java -jar target/attendancesystem-0.0.1-SNAPSHOT.jar
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Contact the development team

## 🎯 Future Enhancements

- [ ] Excel import for bulk student registration
- [ ] Mobile app for student attendance marking
- [ ] Advanced analytics and reporting
- [ ] Email notifications in addition to SMS
- [ ] Multi-language support
- [ ] Offline attendance capability

---

**Built with ❤️ for educational institutes**
