# 🏁 Race-OS Financial Hub

<div align="center">

![Race-OS Logo](https://img.shields.io/badge/Race--OS-Financial%20Hub-blue?style=for-the-badge&logo=racing)

**A comprehensive financial management platform designed specifically for creators, freelancers, and entrepreneurs**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18%2B-blue?logo=react)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)](https://www.mongodb.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [� Documentation](#-documentation) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 **Why Race-OS?**

Race-OS solves the **most critical and interconnected pain points** for modern creators and freelancers:

- 💸 **Income Anxiety**: Never wonder "Will I make enough this month?" again
- 📊 **Tax Complexity**: Automated tax calculations and quarterly payment tracking
- ⏰ **Time Drain**: Eliminate hours spent on manual financial tracking
- 🔗 **Platform Chaos**: Unified dashboard for all income sources and expenses
- 📈 **Growth Planning**: Data-driven insights for scaling your business

## ✨ **Features**

### 📊 **Smart Dashboard**
- Real-time income and expense tracking
- Beautiful visualizations with trend analysis  
- Cash flow predictions and financial alerts
- Multi-platform revenue aggregation

### � **Advanced Tax Management**
- Automated quarterly tax calculations
- Smart expense categorization with ML
- Tax-deductible expense tracking
- Quarterly payment reminders

### 🧾 **Professional Invoicing**
- Custom branded invoice templates
- Automated payment tracking
- Multi-currency support
- PDF generation and email delivery

### 🔗 **Platform Integrations**
- YouTube revenue tracking
- Bank account synchronization
- CSV import/export functionality
- Multiple payment gateway support

### 👥 **Client Management**
- Complete client database
- Project and payment tracking
- Communication history
- Performance analytics

## 🏗️ **Architecture**

```mermaid
graph TB
    A[React Frontend] --> B[Express.js API]
    B --> C[MongoDB Database]
    B --> D[External APIs]
    D --> E[YouTube API]
    D --> F[Bank APIs]
    D --> G[Payment Gateways]
    
    subgraph "Frontend Features"
        A1[Dashboard]
        A2[Invoices]
        A3[Tax Planning]
        A4[Reports]
    end
    
    subgraph "Backend Services"
        B1[Authentication]
        B2[Data Processing]
        B3[ML Categorization]
        B4[Email Service]
    end
```

## 🚀 **Quick Start**

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **Git**

### 1️⃣ Clone & Setup

```bash
# Clone the repository
git clone https://github.com/kayas881/Race-OS.git
cd Race-OS

# Install dependencies for both frontend and backend
npm run install-all
```

### 2️⃣ Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Configure your environment variables
# Edit .env with your MongoDB connection and API keys
```

**Required Environment Variables:**
```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/race-os
# or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/race-os
JWT_SECRET=your-jwt-secret-key

# Email Service (Optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# External APIs (Optional)
YOUTUBE_API_KEY=your-youtube-api-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
```

### 3️⃣ Launch Application

```bash
# Start both frontend and backend simultaneously
npm start

# Or start them separately
npm run backend  # Backend on http://localhost:5000
npm run frontend # Frontend on http://localhost:3000
```

### 4️⃣ First Login

1. Navigate to `http://localhost:3000`
2. Create your account
3. Complete the onboarding setup
4. Start tracking your finances! 🎉
   # Option 1: Use convenience scripts
   ./scripts/start-dev.sh
   
   # Option 2: Manual startup
   cd financial-hub/backend && npm install && npm start
   cd financial-hub/frontend && npm install && npm start
   ```

4. **First Login**

1. Navigate to `http://localhost:3000`
2. Create your account
3. Complete the onboarding setup
4. Start tracking your finances! 🎉

## 📁 **Project Structure**

```
Race-OS/
├── 🏠 Root Configuration
│   ├── package.json                 # Main package config & scripts
│   ├── .env.example                # Environment template
│   └── README.md                   # This file
│
├── 💰 financial-hub/               # Core Application
│   ├── 🔙 backend/                 # Node.js API Server
│   │   ├── config/                 # Database & service configs
│   │   │   └── database.js         # MongoDB connection utilities
│   │   ├── middleware/             # Express middleware
│   │   │   └── auth.js             # Authentication middleware
│   │   ├── models/                 # Data models (legacy)
│   │   ├── routes/                 # API endpoints
│   │   │   ├── dashboard.js        # Dashboard data
│   │   │   ├── invoices.js         # Invoice management
│   │   │   ├── tax.js              # Tax calculations
│   │   │   ├── transactions.js     # Transaction handling
│   │   │   └── integrations.js     # External integrations
│   │   ├── services/               # Business logic
│   │   │   ├── emailService.js     # Email notifications
│   │   │   ├── categorization.js   # ML-powered categorization
│   │   │   └── customTaxService.js # Tax calculation engine
│   │   └── server.js               # Main server file
│   │
│   └── 🎨 frontend/                # React Application
│       ├── public/                 # Static assets
│       ├── src/
│       │   ├── components/         # Reusable UI components
│       │   ├── pages/              # Main application pages
│       │   │   ├── Dashboard.js    # Main dashboard
│       │   │   ├── Invoices.js     # Invoice management
│       │   │   ├── Tax.js          # Tax planning
│       │   │   ├── Transactions.js # Transaction view
│       │   │   └── Integrations.js # Platform connections
│       │   ├── context/            # React contexts
│       │   ├── utils/              # Helper functions
│       │   └── App.js              # Main app component
│       ├── tailwind.config.js      # Tailwind CSS config
│       └── package.json            # Frontend dependencies
│
├── 📚 Documentation                # Comprehensive docs
│   ├── IMPLEMENTATION_OVERVIEW.md  # Technical overview
│   ├── TESTING_GUIDE.md           # Testing instructions  
│   ├── DEPLOYMENT_COMPLETE.md     # Production deployment
│   └── QUICK_START.md             # Getting started guide
│
└── 🧪 Testing & Scripts
    ├── test-*.csv                 # Sample data files
    ├── test-*.sh                  # Testing scripts
    └── start-*.sh                 # Utility scripts
```

## 🛠️ **Tech Stack**

### **Frontend**
- ⚛️ **React 18** - Modern UI framework with hooks
- 🎨 **Tailwind CSS** - Utility-first CSS framework  
- 🎭 **Framer Motion** - Smooth animations and transitions
- 📊 **Recharts** - Beautiful data visualizations
- 🔍 **React Query** - Server state management
- 🧭 **React Router** - Client-side routing

### **Backend**  
- 🟢 **Node.js** - JavaScript runtime
- 🚀 **Express.js** - Web application framework
- 🍃 **MongoDB** - NoSQL database
- 📦 **Mongoose** - MongoDB object modeling
- 🤖 **Natural/ML** - Machine learning for categorization
- 📧 **SendGrid** - Email delivery service
- ⏰ **Node-cron** - Scheduled tasks

### **Database & Services**
- 🗄️ **MongoDB** - Modern NoSQL document database
- 🔐 **JWT Authentication** - Secure token-based auth
- 📊 **RESTful APIs** - Clean API architecture
- 🐳 **Docker** - Containerization support

## 📊 **Key Features Deep Dive**

### Dashboard Analytics
- **Real-time Metrics**: Live income, expenses, and profit tracking
- **Visual Trends**: Month-over-month growth charts and projections
- **Smart Alerts**: Automated notifications for important financial events
- **Tax Jar**: Visual representation of tax obligations and savings

### Invoice Management  
- **Professional Templates**: Customizable, branded invoice designs
- **Automated Tracking**: Payment status updates and reminders
- **Multi-Currency**: Support for international clients
- **PDF Generation**: High-quality PDF invoices with company branding

### Tax Planning
- **Quarterly Estimates**: Automatic calculation of estimated tax payments
- **Deduction Tracking**: Smart categorization of tax-deductible expenses  
- **Payment Reminders**: Never miss a quarterly tax deadline
- **Year-end Reports**: Comprehensive tax preparation documentation

### Platform Integrations
- **YouTube Revenue**: Direct integration with YouTube Analytics API
- **Bank Connections**: Secure bank account synchronization (Plaid)
- **CSV Import/Export**: Flexible data import and backup options
- **API Extensions**: Modular architecture for adding new platforms

## 🧪 **Testing**

```bash
# Run backend tests
npm run test

# Test specific components
cd financial-hub/backend
npm test routes/dashboard.test.js

# Integration testing
chmod +x test-*.sh
./test-invoice-api.sh
```

## 🚀 **Deployment**

### Production Deployment

```bash
# Build the application
npm run build

# Production environment setup
cp .env.example .env.production
# Configure production variables

# Deploy using PM2
npm install -g pm2
pm2 start financial-hub/backend/server.js --name race-os-backend
pm2 startup
pm2 save
```

### Docker Deployment

```bash
# Build and run with Docker
cd financial-hub
docker-compose up -d

# Scale services
docker-compose up --scale backend=2
```

## 🔒 **Security Features**

- 🔐 **JWT Authentication** with secure token management
- 🛡️ **Rate Limiting** to prevent API abuse  
- 🔍 **Input Validation** with express-validator
- 🚫 **CORS Protection** for cross-origin security
- 🔒 **Environment Isolation** for sensitive data
- 📊 **Audit Logging** for financial transactions

## 🤝 **Contributing**

We welcome contributions from developers of all skill levels! Here's how you can help:

### 🌟 **Ways to Contribute**

- 🐛 **Bug Reports**: Found an issue? [Open an issue](https://github.com/kayas881/Race-OS/issues)
- ✨ **Feature Requests**: Have an idea? We'd love to hear it!
- 🔧 **Code Contributions**: Submit pull requests for bug fixes or new features
- 📚 **Documentation**: Help improve our docs and guides
- 🎨 **UI/UX**: Design improvements and accessibility enhancements

### 📋 **Development Setup**

```bash
# Fork the repository
git clone https://github.com/YOUR_USERNAME/Race-OS.git
cd Race-OS

# Create a feature branch
git checkout -b feature/amazing-new-feature

# Make your changes and commit
git add .
git commit -m "Add amazing new feature"

# Push to your fork and create a pull request
git push origin feature/amazing-new-feature
```

### 🎯 **Contribution Guidelines**

1. **Code Style**: Follow existing patterns and use ESLint/Prettier
2. **Testing**: Add tests for new features and ensure existing tests pass
3. **Documentation**: Update relevant documentation for your changes
4. **Commits**: Use clear, descriptive commit messages
5. **Pull Requests**: Provide detailed descriptions of your changes

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👥 **Team & Community**

- **Created by**: Race-OS Team
- **Maintained by**: [kayas881](https://github.com/kayas881)
- **Contributors**: [View all contributors](https://github.com/kayas881/Race-OS/contributors)

### 💬 **Get Help & Connect**

- 🐛 **Issues**: [GitHub Issues](https://github.com/kayas881/Race-OS/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/kayas881/Race-OS/discussions)  
- 📧 **Email**: [Contact Team](mailto:contact@race-os.dev)
- 🐦 **Twitter**: [@RaceOSPlatform](https://twitter.com/raceos)

## 🗺️ **Roadmap**

### 🎯 **Current Focus** (v1.x)
- [ ] Enhanced YouTube integration with detailed analytics
- [ ] Advanced reporting and data export features
- [ ] Mobile-responsive design improvements
- [ ] Multi-language support

### 🚀 **Future Plans** (v2.x)
- [ ] Mobile applications (iOS/Android)
- [ ] Advanced AI-powered financial insights
- [ ] Multi-user team management
- [ ] Cryptocurrency tracking integration
- [ ] Advanced business intelligence dashboard

## 📈 **Project Stats**

<div align="center">

![GitHub Stars](https://img.shields.io/github/stars/kayas881/Race-OS?style=social)
![GitHub Forks](https://img.shields.io/github/forks/kayas881/Race-OS?style=social)
![GitHub Issues](https://img.shields.io/github/issues/kayas881/Race-OS)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/kayas881/Race-OS)

</div>

---

<div align="center">

**Built with ❤️ for creators, freelancers, and entrepreneurs worldwide**

[⭐ Star this repo](https://github.com/kayas881/Race-OS) if you find it helpful!

</div>

## 📖 Documentation

All documentation is organized in the [`docs/`](./docs) folder:

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get up and running quickly
- **[Testing Guide](./docs/TESTING_GUIDE.md)** - How to run tests
- **[Deployment Guide](./docs/DEPLOYMENT_COMPLETE.md)** - Production deployment

## 🛠️ Development

- **Scripts**: All utility scripts are in [`scripts/`](./scripts)
- **Tests**: Test files and sample data in [`tests/`](./tests)
- **Main App**: The financial-hub application in [`financial-hub/`](./financial-hub)

## 🔧 Technology Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Integrations**: Plaid, YouTube API, Twitch API, Patreon API
- **Authentication**: JWT, OAuth 2.0

---

*For detailed setup instructions, see the [Quick Start Guide](./docs/QUICK_START.md)*
