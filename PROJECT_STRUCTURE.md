# 📁 Drena Project Structure

## Root Directory (Essential Files Only)

```
buildsite-flow/
├── README.md                    # Main project README
├── package.json                 # Node.js dependencies
├── package-lock.json            # Lock file
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── components.json              # Shadcn components config
├── eslint.config.js             # ESLint config
├── index.html                   # HTML entry point
├── nginx.conf                   # Nginx configuration
├── Dockerfile                   # Frontend Dockerfile
├── docker-compose.yml           # Development Docker Compose
├── docker-compose.prod.yml      # Production Docker Compose
├── vercel.json                  # Vercel configuration
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
│
├── src/                         # Frontend source code
├── server/                       # Backend source code
├── public/                       # Public assets
├── scripts/                      # Utility scripts
├── database/                     # Database migrations
├── docs/                         # 📚 All documentation
│   ├── deployment/              # Deployment guides
│   │   └── vps/                 # VPS-specific guides
│   ├── fixes/                   # Bug fix documentation
│   ├── status/                  # Implementation status
│   └── guides/                  # Development guides
│
├── data/                         # Runtime data
│   ├── logs/                    # Application logs
│   ├── postgres/                 # PostgreSQL data
│   └── storage/                  # File storage
│
└── dist/                         # Build output (gitignored)
```

## Documentation Organization

### `/docs/deployment/` - Deployment Guides
- Production deployment instructions
- Docker configuration
- Domain and DNS setup
- Environment configuration
- **VPS guides** (`/vps/`)

### `/docs/fixes/` - Fix Documentation
- Service Worker fixes
- Database fixes
- Production fixes
- Bug resolution summaries

### `/docs/status/` - Implementation Status
- Implementation summaries
- Audit reports
- Progress trackers
- Status updates

### `/docs/guides/` - Development Guides
- Enhanced prompts
- Configuration guides
- Analysis documents

## Quick Access

- **Main README**: `README.md`
- **Deployment**: `docs/deployment/`
- **VPS Updates**: `docs/deployment/vps/`
- **Fixes**: `docs/fixes/`
- **Status**: `docs/status/`

---

**Project is now clean and organized!** ✨

