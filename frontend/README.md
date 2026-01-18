# 🎓 USA Attendance System - Frontend

A modern, responsive web application for managing student attendance, built with **Next.js 16**, **React 19**, and **Tailwind CSS**. Features a beautiful glass morphism design with advanced UI components.

## ✨ Features

### 🔐 **Authentication & Security**

- Secure JWT-based authentication
- Protected routes with role-based access
- Login/logout functionality with session management

### 👥 **Student Management**

- **Add new students** with auto-generated Student IDs
- **Bulk student import** via CSV files with validation
- **Student profiles** with contact information and subject enrollment
- **Search and filter** students by batch, subject, or status

### 📊 **Attendance System**

- **Mark attendance** for individual students or entire batches
- **Attendance reports** with date ranges and filters
- **Attendance statistics** and analytics dashboard
- **SMS notifications** to parents for absent students

### 📚 **Academic Management**

- **Batch management** with year-wise organization
- **Subject management** with teacher assignments
- **Fee management** and payment tracking
- **Messaging system** for announcements

### 🎨 **Modern UI/UX**

- **Glass morphism design** with backdrop blur effects
- **Responsive layout** for desktop, tablet, and mobile
- **Dark/light theme support** with system preference detection
- **Animated components** with smooth transitions
- **Loading states** and error handling

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (recommended: v20 LTS)
- **npm** or **yarn** package manager
- **Backend API** running on `http://localhost:8080`

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Dinu-14/USA-Attendance-system-NEW-.git
   cd USA-Attendance-system-NEW-/frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the frontend root:

   ```env
   # API Configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api

   # App Configuration
   NEXT_PUBLIC_APP_NAME="USA Attendance System"
   NEXT_PUBLIC_APP_VERSION="1.0.0"

   # Optional: Analytics (if using)
   # NEXT_PUBLIC_GA_ID="your-google-analytics-id"
   ```

4. **Start development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── dashboard/       # Protected dashboard pages
│   │   │   ├── attendance/  # Attendance management
│   │   │   ├── students/    # Student management
│   │   │   ├── batches/     # Batch management
│   │   │   ├── subjects/    # Subject management
│   │   │   ├── fees/        # Fee management
│   │   │   └── messaging/   # Messaging system
│   │   ├── login/           # Authentication pages
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # Reusable UI components
│   │   ├── layout/          # Layout components
│   │   ├── csv/             # CSV import components
│   │   └── ui/              # Base UI components
│   ├── contexts/            # React Context providers
│   │   ├── auth.tsx         # Authentication context
│   │   └── toast.tsx        # Notification context
│   ├── lib/                 # Utility libraries
│   │   ├── api.ts           # API client configuration
│   │   └── utils.ts         # Helper functions
│   └── types/               # TypeScript type definitions
│       ├── student.ts       # Student-related types
│       ├── attendance.ts    # Attendance types
│       ├── batch.ts         # Batch types
│       └── index.ts         # Type exports
├── public/                  # Static assets
├── tailwind.config.ts       # Tailwind CSS configuration
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 🎨 Technology Stack

### **Core Framework**

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Type-safe development

### **Styling & UI**

- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Beautiful, customizable icons
- **Custom animations** - CSS transitions and keyframes

### **State Management**

- **React Context** - Global state management
- **React Hook Form** - Form state and validation
- **Custom hooks** - Reusable stateful logic

### **HTTP & API**

- **Axios** - HTTP client with interceptors
- **JWT handling** - Automatic token management
- **Error handling** - Centralized error processing

### **Development Tools**

- **ESLint** - Code linting and formatting
- **Prettier** (recommended) - Code formatting
- **VS Code extensions** - Enhanced development experience

## 🔗 API Integration

The frontend communicates with the Spring Boot backend via RESTful APIs:

### **Base URL**

```
http://localhost:8080/api
```

### **Key Endpoints**

- `POST /auth/login` - User authentication
- `GET /admin/students` - Fetch students
- `POST /admin/students` - Create student
- `POST /admin/students/bulk-import` - Bulk CSV import
- `GET /admin/institute/batches` - Fetch batches
- `GET /admin/institute/subjects` - Fetch subjects
- `POST /admin/attendance/mark` - Mark attendance

### **Authentication**

JWT tokens are automatically included in API requests via Axios interceptors.

## 📱 Responsive Design

- **Mobile-first approach** with Tailwind breakpoints
- **Touch-friendly interfaces** on mobile devices
- **Adaptive layouts** for different screen sizes
- **Progressive enhancement** for advanced features

## 🚀 Deployment

### **Production Build**

```bash
npm run build
npm run start
```

### **Environment Variables**

Ensure production environment variables are set:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com/api
```

### **Deployment Platforms**

- **Vercel** (recommended) - Seamless Next.js deployment
- **Netlify** - Static site hosting with serverless functions
- **Docker** - Containerized deployment
- **Traditional hosting** - Build and serve static files

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### **Common Issues**

**API Connection Failed**

- Ensure backend is running on `http://localhost:8080`
- Check CORS configuration in backend
- Verify environment variables

**Build Errors**

- Clear `.next` folder and rebuild
- Check TypeScript errors
- Verify all dependencies are installed

**Authentication Issues**

- Clear browser localStorage
- Check JWT token expiration
- Verify API credentials

### **Getting Help**

- Check the [Issues](https://github.com/Dinu-14/USA-Attendance-system-NEW-/issues) page
- Review backend README for API documentation
- Contact the development team

---

**Built with ❤️ by the USA Institute Development Team**
