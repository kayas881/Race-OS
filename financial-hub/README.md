# Financial Hub MVP

A comprehensive financial management platform designed specifically for creators and freelancers to track income, manage taxes, and optimize their financial operations.

## 🚀 Features

### Phase 1: MVP Implementation

- **Financial Hub Dashboard**: Real-time snapshot of financial health
- **Secure API Integrations**: Connect banks and creator platforms (YouTube, Twitch, Patreon, Substack)
- **Smart Categorization Engine**: ML-powered transaction categorization with creator-specific categories
- **The "Tax Jar"**: Real-time tax liability calculations and quarterly payment recommendations

### Key Components

1. **Dashboard**: 
   - Monthly/quarterly financial summaries
   - Income trends and analytics
   - Recent transactions overview
   - Tax jar status and recommendations

2. **Transaction Management**:
   - Automatic transaction syncing from connected accounts
   - Smart categorization using ML
   - Business vs personal classification
   - Tax deductible expense identification

3. **Tax Center**:
   - Real-time tax calculations
   - Quarterly estimated payment tracking
   - Deduction optimization suggestions
   - Tax strategy recommendations

4. **Account Integration**:
   - Plaid integration for bank accounts
   - Creator platform APIs (YouTube, Twitch, Patreon, Substack)
   - Manual account management

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Plaid API** for bank integrations
- **Natural Language Processing** for transaction categorization
- **JWT** authentication
- **ML/AI** for smart categorization

### Frontend
- **React 18** with functional components
- **React Router** for navigation
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Hook Form** for form management

### External APIs
- **Plaid** - Bank account connections
- **YouTube Data API** - Channel analytics and revenue
- **Twitch API** - Stream revenue and metrics
- **Patreon API** - Subscription data
- **Substack API** - Newsletter revenue

## 📁 Project Structure

```
financial-hub/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware
│   ├── scripts/         # Database seeding and utilities
│   └── server.js        # Express server setup
└── frontend/
    ├── src/
    │   ├── components/  # Reusable UI components
    │   ├── pages/       # Main application pages
    │   ├── context/     # React context providers
    │   └── App.js       # Main application component
    └── public/          # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Plaid API credentials
- Creator platform API keys (optional for full functionality)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd financial-hub/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/financial-hub
   JWT_SECRET=your-secret-key
   PLAID_CLIENT_ID=your-plaid-client-id
   PLAID_SECRET=your-plaid-secret
   # Add other API keys as needed
   ```

5. Seed the database with default categories:
   ```bash
   node scripts/seedCategories.js
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd financial-hub/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Accounts
- `GET /api/accounts` - Get user accounts
- `POST /api/accounts/plaid/create-link-token` - Create Plaid link token
- `POST /api/accounts/plaid/exchange-public-token` - Connect bank account
- `POST /api/accounts/manual` - Add manual account

### Transactions
- `GET /api/transactions` - Get transactions with filtering
- `POST /api/transactions/sync/:accountId` - Sync account transactions
- `POST /api/transactions/manual` - Add manual transaction
- `PUT /api/transactions/:id` - Update transaction

### Tax Management
- `GET /api/tax/current` - Get current year tax calculation
- `GET /api/tax/quarterly/:year/:quarter` - Get quarterly taxes
- `POST /api/tax/calculate` - Force tax recalculation
- `POST /api/tax/real-time-jar` - Calculate tax jar for new transaction

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/quick-stats` - Get quick statistics

## 💡 Smart Categorization

The system uses machine learning and natural language processing to automatically categorize transactions:

### Creator-Specific Categories
- **Ad Revenue**: YouTube AdSense, Twitch ads
- **Sponsorships**: Brand deals and partnerships
- **Subscriptions**: Patreon, Substack memberships
- **Donations**: Super Chat, Twitch bits, direct donations
- **Merchandise**: Store sales and product revenue
- **Affiliate**: Commission-based income

### Business Expenses
- **Equipment**: Cameras, microphones, computers
- **Software**: Adobe Creative Suite, streaming software
- **Marketing**: Social media ads, promotional content
- **Education**: Courses, conferences, skill development

### Tax Optimization
- Automatic identification of tax-deductible expenses
- Real-time tax liability calculations
- Quarterly payment recommendations
- Deduction optimization suggestions

## 🔒 Security Features

- JWT-based authentication
- Encrypted sensitive data storage
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- Secure API key management

## 📊 Dashboard Features

### Financial Overview
- Total account balances
- Monthly income/expense summaries
- Year-to-date financial metrics
- Platform-specific revenue breakdown

### Tax Jar Widget
- Real-time tax savings tracker
- Quarterly payment countdown
- Recommended savings rate
- Tax strategy suggestions

### Income Analytics
- 6-month income trend charts
- Platform performance comparison
- Category-wise revenue breakdown
- Growth metrics and projections

## 🎯 Roadmap

### Phase 2: Enhanced Features
- Advanced reporting and analytics
- Tax form generation (1099, Schedule C)
- Expense receipt management
- Multi-currency support
- Team/contractor management

### Phase 3: Advanced Integrations
- Additional creator platforms (TikTok, Instagram)
- Accounting software integration (QuickBooks)
- Tax professional collaboration tools
- Mobile app development

### Phase 4: AI & Automation
- Predictive tax planning
- Automated expense categorization
- Smart savings recommendations
- Financial goal tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## 🙏 Acknowledgments

- Plaid for banking API infrastructure
- Creator platform APIs for revenue integration
- Open-source libraries and tools used
- The creator and freelancer community for inspiration
