# Knitly - Intelligent Personal Finance Tracker PRD

## Executive Summary
Knitly is a modern, AI-powered personal finance tracker that automatically extracts and categorizes transactions from email confirmations. Built as a full-stack TypeScript monorepo, it provides users with intelligent insights into their spending patterns while maintaining privacy and security through local processing.

## Product Vision
To become the most intelligent and seamless personal finance tracking solution by leveraging email-based transaction extraction, AI categorization, and comprehensive analytics - all while respecting user privacy.

## Target Users
- **Primary**: Tech-savvy professionals aged 25-40 who receive most transaction confirmations via email
- **Secondary**: Small business owners tracking business expenses
- **Tertiary**: Students learning financial literacy

## Core Problem Statement
Users struggle to maintain accurate financial records because:
1. Manual transaction entry is time-consuming and error-prone
2. Bank/card statements are delayed and lack merchant context
3. Existing tools require sharing banking credentials
4. Transaction categorization is inconsistent across platforms
5. No meaningful insights are provided for spending behavior improvement

## Solution Overview
Knitly solves these problems by:
1. **Automated Email Processing**: Connects to Gmail to extract transaction data from merchant emails
2. **AI-Powered Categorization**: Uses OpenAI to intelligently categorize and parse transaction details
3. **Privacy-First Approach**: Processes data locally without sharing banking credentials
4. **Real-Time Analytics**: Provides immediate insights and spending pattern analysis
5. **Merchant Intelligence**: Builds detailed merchant profiles and spending analytics

## Technical Architecture

### Current Tech Stack
- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **Backend**: tRPC, Supabase (PostgreSQL), Drizzle ORM
- **Authentication**: Supabase Auth with Google OAuth
- **UI**: shadcn/ui components, Tailwind CSS
- **Background Jobs**: Trigger.dev for email processing
- **AI/ML**: OpenAI GPT-4 for transaction extraction
- **Testing**: Playwright E2E, Jest unit tests
- **Infrastructure**: Vercel deployment, monorepo with pnpm

### Monorepo Structure
```
apps/
├── main/           # Core Next.js application
├── website/        # Marketing landing pages
└── e2e-main/       # End-to-end testing

packages/
├── database/       # Centralized database schemas and queries
├── tasks/          # Background job definitions
├── ui/             # Shared UI component library
└── config/         # Shared configuration packages
```

## Feature Requirements

### Phase 1: Core MVP (Current State)
**Authentication & Onboarding**
- ✅ Google OAuth authentication via Supabase
- ✅ Gmail API integration with proper scopes
- ✅ User profile creation and management
- ✅ OAuth token refresh handling

**Email Processing Engine**
- ✅ Automated email sync from Gmail
- ✅ Email filtering for transaction-related messages
- ✅ AI-powered transaction data extraction using OpenAI
- ✅ Merchant identification and categorization
- ✅ Duplicate transaction detection using Fellegi-Sunter algorithm
- ✅ Background job processing with Trigger.dev

**Transaction Management**
- ✅ Transaction storage in Supabase with comprehensive schema
- ✅ Transaction viewing and filtering in data tables
- ✅ Manual transaction editing and categorization
- ✅ Currency support (primarily INR)
- ✅ Transaction status tracking (completed, pending, failed)

**Analytics Dashboard**
- ✅ Spending overview with time-based filtering
- ✅ Category-wise spending breakdown
- ✅ Monthly/weekly spending trends
- ✅ Merchant-specific analytics
- ✅ Interactive charts using Recharts

**System Architecture**
- ✅ Monorepo structure with strict separation of concerns
- ✅ Type-safe API layer with tRPC
- ✅ Centralized database management
- ✅ SSR with Supabase Auth
- ✅ Comprehensive error handling and logging

### Phase 2: Enhanced Intelligence & User Experience
**Advanced Analytics**
- 🔄 Spending predictions and forecasting
- 🔄 Anomaly detection for unusual spending patterns
- 🔄 Budget creation and tracking
- 🔄 Goal setting and progress monitoring
- 🔄 Comparative spending analysis (month-over-month, year-over-year)

**Enhanced Transaction Processing**
- 🔄 Support for multiple email providers (Outlook, Yahoo)
- 🔄 PDF receipt processing and OCR extraction
- 🔄 SMS transaction parsing
- 🔄 Multi-currency support with real-time exchange rates
- 🔄 Subscription and recurring payment detection

**User Experience Improvements**
- 🔄 Mobile-responsive design optimization
- 🔄 Dark mode theme
- 🔄 Advanced filtering and search capabilities
- 🔄 Bulk transaction operations
- 🔄 Export functionality (CSV, PDF reports)

**Merchant Intelligence**
- 🔄 Merchant categorization refinement
- 🔄 Location-based spending analysis
- 🔄 Merchant recommendation system
- 🔄 Price comparison and deal alerts

### Phase 3: Advanced Features & Integrations
**AI-Powered Insights**
- 🔄 Personalized financial recommendations
- 🔄 Spending behavior analysis with psychological insights
- 🔄 Automated budget suggestions
- 🔄 Financial health scoring

**Banking Integrations**
- 🔄 Open banking API connections (where available)
- 🔄 Credit score monitoring integration
- 🔄 Investment portfolio tracking
- 🔄 Loan and EMI tracking

**Social & Sharing Features**
- 🔄 Spending challenges with friends
- 🔄 Anonymous spending comparisons
- 🔄 Financial goal sharing
- 🔄 Family account management

**Enterprise Features**
- 🔄 Business expense tracking
- 🔄 Tax categorization and reporting
- 🔄 Multi-user team accounts
- 🔄 API access for third-party integrations

## Success Metrics

### User Engagement
- Daily active users (target: 70% of monthly users)
- Session duration (target: >5 minutes average)
- Feature adoption rate (target: >60% for core features)
- User retention (target: >80% after 30 days)

### Product Performance
- Email processing accuracy (target: >95%)
- Transaction categorization accuracy (target: >90%)
- System uptime (target: 99.9%)
- Average response time (target: <500ms)

### Business Metrics
- User acquisition cost
- Monthly recurring revenue (if applicable)
- Customer lifetime value
- Net promoter score (target: >50)

## Implementation Timeline

### Phase 1 (Months 1-3) - Current MVP Completion
- Complete E2E testing infrastructure
- Enhance error handling and user feedback
- Implement comprehensive analytics dashboard
- Performance optimization and bug fixes

### Phase 2 (Months 4-6) - Enhanced Features
- Advanced analytics and insights
- Mobile responsiveness improvements
- Multi-currency support
- Enhanced merchant intelligence

### Phase 3 (Months 7-12) - Advanced Platform
- AI-powered financial recommendations
- Banking integrations
- Enterprise features
- International expansion

## Technical Requirements

### Performance Requirements
- Page load times under 2 seconds
- Email processing within 30 seconds of receipt
- Support for 10,000+ transactions per user
- 99.9% uptime for core features

### Security Requirements
- End-to-end encryption for sensitive data
- OAuth 2.0 compliance for email access
- GDPR and privacy regulation compliance
- Regular security audits and penetration testing
- Secure token storage and refresh mechanisms

### Testing Requirements
- ✅ Unit test coverage >80% for critical business logic
- ✅ E2E test coverage for core user journeys
- ✅ Integration testing for email processing pipeline
- 🔄 Performance testing under load
- 🔄 Security testing for authentication flows

## Risk Assessment

### Technical Risks
- **High**: Gmail API rate limiting and policy changes
- **Medium**: OpenAI API cost scaling with user growth
- **Medium**: Email parsing accuracy for new merchant formats
- **Low**: Database performance at scale

### Business Risks
- **High**: Competition from established fintech companies
- **Medium**: Regulatory changes affecting email access
- **Medium**: User privacy concerns with email processing
- **Low**: Technology stack obsolescence

## Conclusion
Knitly represents a modern approach to personal finance tracking, leveraging cutting-edge technology to provide users with intelligent, automated, and privacy-respecting financial insights. The current technical foundation is robust and scalable, positioning the platform for significant growth and feature expansion.