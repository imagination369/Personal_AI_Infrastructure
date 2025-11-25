# PAI Business Dashboard

A production-ready Next.js 14+ dashboard for Personal AI Infrastructure business intelligence, analytics, and real-time insights.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4+ with custom dark theme
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Real-time**: Socket.io Client
- **Package Manager**: Bun

## Features

- Dark-first responsive design
- Real-time data updates via WebSocket
- Type-safe development with TypeScript
- Optimized performance with Next.js 14
- Custom utility functions and helpers
- Production-ready configuration
- Security headers and best practices

## Getting Started

### Prerequisites

- Node.js 18.17.0 or higher
- Bun 1.0.0 or higher (recommended)

### Installation

1. Clone the repository and navigate to the dashboard:

```bash
cd /home/user/Personal_AI_Infrastructure/pai-dashboard
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration values:
- GHL_API_KEY: Your GoHighLevel API key
- GHL_LOCATION_ID: Your GoHighLevel location ID
- DATABASE_URL: Your PostgreSQL connection string
- And other required variables

### Development

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
bun run build
```

### Start Production Server

```bash
bun start
```

## Project Structure

```
pai-dashboard/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
│   └── utils.ts          # Common utilities
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── public/               # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies

```

## Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint
- `bun type-check` - Run TypeScript type checking

## Configuration

### Tailwind CSS

Custom dark theme configuration with:
- Extended color palette optimized for dashboards
- Custom components (cards, buttons, inputs)
- Utility classes for animations and effects
- Glass morphism and gradient utilities

### TypeScript

Path aliases configured for clean imports:
- `@/components/*` - Components directory
- `@/lib/*` - Library utilities
- `@/hooks/*` - Custom hooks
- `@/types/*` - Type definitions
- `@/app/*` - App directory

### Next.js

- React Strict Mode enabled
- SWC minification
- Security headers configured
- Image optimization setup

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `NEXT_PUBLIC_APP_URL` - Application URL
- `GHL_API_KEY` - GoHighLevel API key
- `GHL_LOCATION_ID` - GoHighLevel location ID
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow Next.js 14 App Router conventions
- Use Tailwind CSS for styling
- Implement responsive design mobile-first
- Write semantic, accessible HTML

### Component Guidelines

- Keep components small and focused
- Use server components by default
- Add 'use client' only when needed
- Implement proper error boundaries
- Add loading states for async operations

### Performance

- Optimize images with Next.js Image component
- Implement code splitting and lazy loading
- Use React Server Components where possible
- Minimize client-side JavaScript
- Implement proper caching strategies

### Security

- Never commit `.env` files
- Sanitize user inputs
- Implement proper authentication
- Use security headers
- Follow OWASP guidelines

## License

Private - Personal AI Infrastructure

## Support

For issues or questions, contact the PAI team.
