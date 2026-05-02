# Deltalytix

<div align="center">
  <img src="public/apple-icon.png" alt="Deltalytix Logo" width="120" height="120">
  
  <h3>Open-source trading analytics platform for professional traders</h3>
  
  [![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
  [![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/a5YVF5Ec2n)
  
  <a href="https://trustmrr.com/startup/deltalytix" target="_blank"><img src="https://trustmrr.com/api/embed/deltalytix?format=svg" alt="TrustMRR verified revenue badge" width="220" height="90" /></a>
  
  [🚀 Live Demo](https://deltalytix.app) • [💬 Discord Community](https://discord.gg/a5YVF5Ec2n) • [🐛 Report Bug](https://github.com/hugodemenez/deltalytix/issues)
</div>

---

## ✨ Key Features

  <div align="center">
  <img src="public/dashboard-overview.gif" alt="Dashboard overview GIF" width="650" style="margin-bottom: 1.5rem;" />
</div>

### 📊 Advanced Trading Analytics

- **Real-time PnL tracking** with customizable performance metrics
- **Interactive dashboards** with drag-and-drop widget layouts
- **Comprehensive trade analysis** with decile statistics and pattern recognition
- **Customizable chart views** supporting multiple timeframes and indicators

### 📈 Realtime Market Data

- **Live quotes** via Finnhub WebSocket & REST API
- **Unrealized P&L widget** in the header — always in sync with open positions
- **SWR-powered polling hooks** with smart deduplication and caching

### 🧠 Behavioral Analytics

- **Pattern detectors** — revenge trading, overtrading, tilt, FOMO and more
- **Alert cards panel** with severity levels and actionable insights
- **Date-filtered API** with auth guard and full unit-test coverage

### 📅 Economic Calendar

- **TradingEconomics / Finnhub events** overlaid on the trading calendar
- **P&L vs event scatter chart** — correlation analysis with stats
- **Event detail popovers** showing impact on individual trades

### 🎮 Gamification & Retention

- **XP & leveling system** — earn XP for every trade logged
- **20 achievements** across 5 categories (consistency, performance, discipline, volume, milestones)
- **Streak tracking** — daily login and trading streaks with fire indicators
- **Leaderboard** with privacy-safe display names
- **Profile badge** in the navbar showing current level and progress

### 🔗 Multi-Broker Integration

- **Tradovate sync** for real-time trade data synchronization
- **Rithmic sync** via proprietary service integration
- **Built-in integrations** for FTMO, ProjectX, ATAS, and Interactive Brokers (IBKR)
- **AI-powered file parsing** for any broker format when specific integration doesn't exist yet

### 🤖 AI-Powered Insights

- **Intelligent field mapping** for seamless data imports
- **Sentiment analysis** of trading patterns and market conditions
- **Automated trade journal** with AI-generated insights
- **Pattern recognition** for identifying trading opportunities
- **Rich text editor** with image resizing and table support for structured journaling

### 🌍 Internationalization

- **Full i18n support** with English and French translations
- **Extensible translation system** using next-international
- **Locale-aware formatting** for dates, numbers, and currencies

### ⚡ Modern Technology Stack

- **Next.js 15** with App Router for optimal performance
- **React 19** with latest concurrent features
- **TypeScript** for type-safe development
- **Prisma ORM** for database operations
- **Supabase** for authentication and real-time features

---

## 🛠️ Tech Stack & Architecture

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion with performance optimizations
- **State Management**: Zustand stores + React Context
- **Internationalization**: next-international

### Backend

- **API**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma with type-safe queries
- **Authentication**: Supabase Auth (Discord OAuth, Email)
- **Real-time**: WebSocket connections for live data

### External Services

- **Payments**: Stripe integration with webhooks
- **AI/ML**: OpenAI API for analysis and field mapping
- **Market Data**: Finnhub (realtime quotes, economic events)
- **Storage**: Supabase Storage for file uploads
- **Broker Syncs**: Tradovate API, Rithmic proprietary service
- **Platform Integrations**: FTMO, ProjectX, ATAS, Interactive Brokers (IBKR)
- **Deployment**: Vercel-optimized with edge functions

### Development Tools

- **Package Manager**: Bun (recommended) or npm
- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript strict mode
- **Database Migrations**: Prisma migrations

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

### Required Software

- **Node.js 20+** or **Bun** (latest version recommended)
- **Git** for version control
- **PostgreSQL** database (or use Supabase free tier)

### Required Accounts

- **Supabase account** ([free tier available](https://supabase.com))
- **Stripe account** (for payment processing)
- **OpenAI API key** (for AI features)
- **Discord application** (for OAuth authentication)
- **Finnhub API key** ([free tier available](https://finnhub.io)) — for realtime quotes & economic calendar

---

## 🚀 Installation & Setup

### Step 1: Clone and Install

```bash
git clone https://github.com/hugodemenez/deltalytix.git
cd deltalytix
npm install  # or bun install
```

### Step 2: Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=your_postgresql_connection_string

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Finnhub (realtime quotes & economic calendar)
FINNHUB_API_KEY=your_finnhub_api_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# Or run migrations (for production)
npx prisma migrate dev

# Apply gamification tables
psql $DATABASE_URL -f prisma/migrations/phase5_gamification.sql

# Seed the database (optional)
npx prisma db seed
```

### Step 4: Run Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## ⚙️ Configuration Guide

### Supabase Setup

1. Create a new Supabase project
2. Enable Discord OAuth provider in Authentication settings
3. Configure Row Level Security (RLS) policies
4. Set up storage buckets for file uploads
5. Configure real-time subscriptions for live data

### Stripe Configuration

1. Create a Stripe account and get API keys
2. Set up webhook endpoints for payment processing
3. Configure products and pricing plans
4. Test webhook integration in development

### Discord OAuth Setup

1. Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to OAuth2 settings and add redirect URI: `http://localhost:3000/api/auth/callback/discord`
3. Copy Client ID and Client Secret to environment variables
4. Enable the `identify` and `email` scopes for user authentication

### Finnhub Setup

1. Sign up at [finnhub.io](https://finnhub.io) and get a free API key
2. Add `FINNHUB_API_KEY` to `.env.local`
3. Free tier supports 60 req/min — sufficient for development and small-scale production

### OpenAI Integration

1. Get an API key from OpenAI
2. Configure usage limits and billing
3. Test API connectivity with the field mapping feature

---

## 📁 Project Structure

```
deltalytix/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Internationalized routes
│   │   ├── dashboard/     # Main dashboard pages
│   │   │   ├── achievements/  # Gamification achievements page
│   │   │   └── components/   # Dashboard-specific components
│   │   ├── admin/         # Admin panel
│   │   ├── business/      # Business features
│   │   └── (landing)/     # Marketing pages
│   └── api/               # API routes
│       ├── ai/            # AI-powered endpoints
│       ├── auth/          # Authentication
│       ├── quotes/        # Realtime market quotes (Finnhub)
│       ├── economic-events/   # Economic calendar events
│       ├── behavioral-analytics/  # Behavioral pattern analysis
│       ├── gamification/  # XP, levels, achievements, leaderboard
│       ├── stripe/        # Payment processing
│       └── cron/          # Scheduled tasks
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (Radix UI)
│   ├── realtime/         # Live quotes & unrealized P&L widgets
│   ├── behavioral/       # Behavioral analytics alert cards
│   ├── calendar/         # Economic events overlay & correlation
│   ├── gamification/     # XP bar, badges, achievements, streaks, leaderboard
│   ├── ai-elements/      # AI-powered components
│   ├── emails/           # Email templates
│   └── tiptap/           # TipTap editor components
├── server/               # Server-side business logic
│   └── gamification/     # Server actions: recalcStats, grantAchievement
├── store/                # Zustand state management
│   └── gamification-store.ts  # Achievement toast queue
├── hooks/                # Custom React hooks
│   ├── use-realtime-quotes.ts
│   ├── use-unrealized-pnl.ts
│   ├── use-behavioral-analytics.ts
│   ├── use-economic-events.ts
│   └── use-gamification.ts
├── lib/                  # Utility functions & clients
│   ├── finnhub.ts        # Finnhub REST/WS client
│   ├── economic-calendar.ts  # Economic events client
│   ├── behavioral-analytics.ts  # Pattern detectors
│   └── gamification/     # XP formulas, achievements catalog
├── prisma/               # Database schema and migrations
│   └── migrations/
│       └── phase5_gamification.sql  # UserStats, Achievement, Streak, Referral
├── locales/              # Internationalization files (EN/FR)
├── docs/                 # Feature documentation
└── content/              # MDX content for updates
```

---

## 🧑‍💻 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow Next.js best practices
- Implement proper error handling
- Write self-documenting code

### Translation System

Use the `useI18n` hook for all user-facing text:

```typescript
import { useI18n } from "@/locales/client"

const t = useI18n()

// Basic translation
<CardTitle>{t('propFirm.title')}</CardTitle>

// Translation with variables
<DialogTitle>{t('propFirm.configurator.title', { accountNumber: account.accountNumber })}</DialogTitle>
```

### State Management

- Use Zustand stores for client-side state
- Use React Context for complex mutations
- Prefer Server Actions for data mutations
- Use API routes for public data with caching

### API Design

- **API Routes**: For public data that benefits from caching
- **Server Actions**: For mutations and private operations
- **Real-time**: Use Supabase subscriptions for live updates

---

## 🤝 Contributing

We welcome contributions to Deltalytix! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Workflow

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all translations are included
- Test on both desktop and mobile

### Reporting Issues

- Use GitHub Issues for bug reports
- Include steps to reproduce
- Provide system information
- Add screenshots if applicable

### Feature Requests

- Use GitHub Discussions for feature ideas
- Check existing issues before creating new ones
- Provide detailed use cases and benefits

---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

### Key Points:

- ✅ **You can use, modify, and distribute this software for non-commercial purposes**
- ✅ **You must give appropriate credit and provide a link to the license**
- ✅ **You can create derivative works for non-commercial use**
- ❌ **You cannot use this software for commercial purposes**
- ❌ **You cannot distribute this software commercially without permission**

**For commercial licensing options, please contact us.**

Read the full license text in the [LICENSE](LICENSE) file.

---

## 🆘 Support & Community

### Get Help

- 💬 **Discord Community**: [Join our Discord](https://discord.gg/a5YVF5Ec2n) for real-time support
- 📚 **GitHub Discussions**: Ask questions and share ideas
- 🐛 **Issue Tracker**: Report bugs and request features
- 📖 **Documentation**: Check our comprehensive guides

### Stay Updated

- ⭐ **Star the repository** to show your support
- 👀 **Watch for releases** to get notified of updates
- 🐦 **Follow us on social media** for announcements

---

## 🙏 Acknowledgments

### Contributors

Thank you to all the contributors who help make Deltalytix better!

### Open Source Projects

This project builds upon many excellent open source libraries:

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Prisma](https://prisma.io/) - Database toolkit
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Framer Motion](https://framer.com/motion/) - Animation library
- [Radix UI](https://radix-ui.com/) - Accessible component primitives
- [Finnhub](https://finnhub.io/) - Market data provider

---

## 🗺️ Roadmap

### ✅ Recently Completed

- [x] **Custom Dashboard Layout** - Drag-and-drop widgets with flexible workspace customization
- [x] **AI-Powered Data Import** - Intelligent field mapping for seamless CSV processing
- [x] **Enhanced Data Processing** - Multi-platform support with encryption and accurate commission calculations
- [x] **Automatic Rithmic Integration** - Direct API connection with hourly data synchronization
- [x] **Tradovate Synchronization** - Real-time trade data sync with automated import
- [x] **Interactive Brokers Integration** - PDF statement import system for comprehensive trade data
- [x] **AMP Integration** - Connected through Rithmic sync for seamless data flow
- [x] **Subscription Plans** - Flexible pricing tiers for different trader needs
- [x] **Bulk Trade Editing** - Edit multiple trades at once with bulk operations or modify individual trades directly in the table
- [x] **Journal with Image Resizing and Tables** - Enhanced journal editor with draggable image resizing, table creation, and session-based tag application
- [x] **Teams Platform** - Create trading teams, invite members, and view combined performance analytics across all team traders
- [x] **Manual Trade Entry** - Enter trades manually with intelligent auto-commission calculation based on historical data
- [x] **Prop Firms Catalogue** - Browse prop trading firms with aggregated statistics on account counts, payout rates, and success metrics
- [x] **Accounts Table View** - Enhanced accounts overview with table view option and improved account management
- [x] **Multi-Day Weekday Filters** - Select multiple days at once for filtering charts and analytics
- [x] **Calendar Modal Enhancements** - Daily statistics widget and improved trade review in calendar modal
- [x] **Account Configurator Improvements** - Search functionality for prop firms, reset date consideration, and group management
- [x] **Automated Journaling System** - AI-assisted trade journaling that focuses on mistakes and successes
- [x] **Collaborative AI Assistant** - AI Trading Coach with data-aware conversations, pattern recognition, and behavioral insights
- [x] **Realtime Market Data** *(Phase 2)* — Finnhub quotes, unrealized P&L widget, live polling hooks
- [x] **Behavioral Analytics** *(Phase 3)* — Revenge trading, overtrading, tilt & FOMO detectors with alert panel
- [x] **Economic Calendar** *(Phase 4)* — Event overlays on calendar, P&L vs event correlation scatter, event detail popovers
- [x] **Gamification** *(Phase 5)* — XP leveling, 20 achievements, daily streaks, leaderboard, profile badge in navbar

### 🔄 Currently In Development

- [ ] **Performance Center** *(Phase 6)* — Deep analytics: win rate by time/instrument/weekday, MAE/MFE, drawdown, period comparison, PDF/CSV export
- [ ] **Mobile Optimization** — Fully responsive design with mobile-specific enhancements
- [ ] **On premise deployment** — Dockerized version for self-hosting (uses postgres container)

### 📋 Upcoming Features (Q2-Q3 2026)

- [ ] **Trade Review & Playbook** *(Phase 7-8)* — Setup library, execution quality scoring, per-setup win rate & expectancy
- [ ] **Risk Management Dashboard** *(Phase 9)* — Daily loss limit tracker, position sizing calculator, real-time drawdown alerts
- [ ] **Enhanced Journaling Experience** — Session-based analysis with automated insights on trading patterns
- [ ] **Market Data Integration** — Databento connection for real-time market insights and context

### 🚀 Long-term Vision (2027+)

- [ ] **Third-Party Dashboard Licensing** - Prop firms can embed Deltalytix directly into their platforms
- [ ] **Interactive Brokers API Integration** - Direct sync replacing PDF imports for real-time data
- [ ] **Advanced Market Analytics** - Deep market insights powered by Databento data feeds
- [ ] **White-Label Solutions** - Customizable platform for trading firms and educational institutions
- [ ] **Advanced Risk Management** - Real-time alerts and automated risk monitoring
- [ ] **Mobile PWA** — Offline-first cache, push notifications for achievements and streaks
- [ ] **Portfolio Optimization Tools** - Modern portfolio theory and risk-adjusted returns

### 🎯 Strategic Focus Areas

- **Trader-Centric Development** — All features designed specifically for individual traders
- **AI-Human Collaboration** — Seamless integration of AI insights into natural trading workflow
- **Automated Learning** — Systems that help traders identify and learn from their patterns
- **Market Context Integration** — Connecting trading performance to broader market conditions

---

<div align="center">
  <p>Made with ❤️ by Hugo DEMENEZ & the Deltalytix community</p>
  <p>
    <a href="https://github.com/hugodemenez/deltalytix">GitHub</a> •
    <a href="https://discord.gg/a5YVF5Ec2n">Discord</a> •
    <a href="https://deltalytix.app">Website</a>
  </p>
</div>
