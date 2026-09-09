# Software Requirements Specification (SRS)
## Finance Management API

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | August 8, 2026 |
| **Status** | Draft |
| **Prepared for** | Finance Management API — Public Release |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the Finance Management API, a backend service for personal budgeting (expense/income tracking, category budgets, recurring bills, savings goals, and spending reports). It covers the existing single-tenant design and the additions required to operate the system reliably as a **publicly accessible, multi-user** service.

### 1.2 Scope
The system is a RESTful API built on FastAPI that allows registered users to:
- Manage accounts (checking, savings, credit)
- Categorize and log income/expense transactions
- Track recurring bills and auto-generate transactions from them
- Set and monitor savings goals
- Generate spending reports (by category, income vs. expense, net worth)

Out of scope for this version: a frontend UI, direct bank account linking (e.g., Plaid), and multi-currency support.

### 1.3 Definitions, Acronyms, Abbreviations
| Term | Meaning |
|---|---|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| SRS | Software Requirements Specification |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| ORM | Object-Relational Mapping |

### 1.4 References
- Project `README.md` (existing project structure and setup)
- Project `requirements.txt` (existing dependencies)
- FastAPI, SQLAlchemy, Alembic official documentation

### 1.5 Overview
Section 2 gives a high-level description of the product. Section 3 lists functional requirements by module. Section 4 covers external interfaces. Section 5 covers non-functional requirements. Section 6 covers data requirements. Section 7 gives an updated architecture overview. Section 8 is an appendix with the revised dependency list.

---

## 2. Overall Description

### 2.1 Product Perspective
The current implementation is a single-service FastAPI backend with a PostgreSQL database, JWT-based auth, and no external service dependencies beyond the database. Going public introduces new dependencies: a cache/queue layer (Redis), a background worker (Celery or APScheduler), outbound email, and error monitoring.

### 2.2 Product Functions (Summary)
- User registration, login, and session management
- Account CRUD
- Category CRUD
- Transaction CRUD with automatic account balance updates
- Recurring bill definitions with scheduled auto-generation of transactions
- Savings goal tracking
- Spending/income/net-worth reporting
- **New:** email verification, password reset, rate limiting, error monitoring, automated background jobs

### 2.3 User Classes and Characteristics
| User Class | Description |
|---|---|
| Registered User | Authenticated individual managing their own financial data |
| Anonymous Visitor | Can reach `/auth/signup`, `/auth/login`, and public docs only |
| System Administrator | Operates infrastructure; not a distinct API role in v1, but needs backend access for support/monitoring |

### 2.4 Operating Environment
- Python 3.11+, FastAPI, Uvicorn/Gunicorn
- PostgreSQL 14+
- Redis 7+ (new)
- Deployed behind HTTPS (reverse proxy / load balancer)
- Linux-based container or VM hosting

### 2.5 Design and Implementation Constraints
- Must remain a stateless API (session state lives in JWT/Redis, not in-process)
- All financial values stored as fixed-precision decimals, never floats
- All endpoints (except signup/login) require authentication
- All data access must be scoped to the authenticated user (no cross-user reads/writes)

### 2.6 Assumptions and Dependencies
- Users provide their own transaction data manually (no bank integration in this version)
- A transactional email provider (SMTP or API-based, e.g., SendGrid/Postmark) will be available in production
- Deployment target supports running a separate worker process for background jobs

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management
| ID | Requirement |
|---|---|
| FR-1.1 | System shall allow a new user to sign up with email + password |
| FR-1.2 | System shall hash passwords using bcrypt before storage |
| FR-1.3 | System shall issue a short-lived JWT access token on login |
| FR-1.4 | System shall issue a longer-lived refresh token to obtain new access tokens without re-login *(new)* |
| FR-1.5 | System shall send a verification email on signup; unverified accounts have restricted access *(new)* |
| FR-1.6 | System shall support a "forgot password" flow via a time-limited reset token sent by email *(new)* |
| FR-1.7 | System shall rate-limit login and signup attempts per IP/account to mitigate brute-force attacks *(new)* |

### 3.2 Accounts
| ID | Requirement |
|---|---|
| FR-2.1 | User shall be able to create an account of type checking, savings, or credit |
| FR-2.2 | User shall be able to view, update, and delete only their own accounts |
| FR-2.3 | System shall maintain a running balance per account, updated automatically by transactions |

### 3.3 Categories
| ID | Requirement |
|---|---|
| FR-3.1 | User shall be able to create custom budget categories with optional monthly limits |
| FR-3.2 | User shall be able to view, update, and delete only their own categories |

### 3.4 Transactions
| ID | Requirement |
|---|---|
| FR-4.1 | User shall be able to log a transaction (amount, type, category, account, date, note) |
| FR-4.2 | System shall automatically adjust the associated account balance on create/update/delete |
| FR-4.3 | System shall support paginated retrieval of transactions, with filtering by date range and category |

### 3.5 Recurring Bills
| ID | Requirement |
|---|---|
| FR-5.1 | User shall be able to define a recurring bill (amount, category, account, frequency, due day) |
| FR-5.2 | System shall automatically generate a transaction on each bill's due date via a scheduled background job *(new — implements README's noted "next step")* |
| FR-5.3 | System shall notify the user (in-app or email) when a recurring bill is generated or overdue *(new)* |

### 3.6 Savings Goals
| ID | Requirement |
|---|---|
| FR-6.1 | User shall be able to create a savings goal with a target amount and optional target date |
| FR-6.2 | System shall track progress toward each goal based on linked account/transaction activity |

### 3.7 Reports
| ID | Requirement |
|---|---|
| FR-7.1 | System shall provide spending-by-category reports for a given date range |
| FR-7.2 | System shall provide income-vs-expense summaries |
| FR-7.3 | System shall provide a net-worth calculation across all accounts |

### 3.8 Reliability Add-ons
| ID | Requirement |
|---|---|
| FR-8.1 | System shall log unhandled exceptions to an error-monitoring service (e.g., Sentry) *(new)* |
| FR-8.2 | System shall have an automated test suite covering all endpoints and core business logic (balance updates, recurring generation) *(new)* |
| FR-8.3 | System shall run recurring-bill generation as an idempotent background job to avoid duplicate transactions on retry *(new)* |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Interactive API documentation via Swagger UI at `/docs` and ReDoc at `/redoc` (existing, via FastAPI)

### 4.2 API Interfaces (Key Endpoints)
| Router | Endpoints |
|---|---|
| `auth` | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh` *(new)*, `POST /auth/verify-email` *(new)*, `POST /auth/forgot-password` *(new)*, `POST /auth/reset-password` *(new)* |
| `accounts` | `GET/POST /accounts`, `GET/PUT/DELETE /accounts/{id}` |
| `categories` | `GET/POST /categories`, `GET/PUT/DELETE /categories/{id}` |
| `transactions` | `GET/POST /transactions` (paginated), `GET/PUT/DELETE /transactions/{id}` |
| `recurring_bills` | `GET/POST /recurring-bills`, `GET/PUT/DELETE /recurring-bills/{id}` |
| `savings_goals` | `GET/POST /savings-goals`, `GET/PUT/DELETE /savings-goals/{id}` |
| `reports` | `GET /reports/spending-by-category`, `GET /reports/income-vs-expense`, `GET /reports/net-worth` |

### 4.3 Software Interfaces
| Component | Purpose |
|---|---|
| PostgreSQL | Primary data store |
| Redis *(new)* | Rate-limit counters, refresh-token/session blacklist, Celery broker |
| Celery or APScheduler *(new)* | Background job execution (recurring bill generation) |
| SMTP / email API *(new)* | Verification and password-reset emails |
| Sentry (or equivalent) *(new)* | Error tracking and alerting |

### 4.4 Communication Interfaces
- All traffic over HTTPS/TLS in production
- Authentication via `Authorization: Bearer <JWT>` header

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | 95th-percentile response time under 300ms for standard CRUD endpoints under normal load |
| **Security** | Passwords hashed with bcrypt; JWTs signed with a rotated secret; all user-scoped queries filtered by authenticated user ID; rate limiting on auth endpoints |
| **Reliability** | Background jobs must be idempotent and retry-safe; database migrations managed via Alembic (no ad-hoc schema changes in prod) |
| **Availability** | Target 99.5% uptime once in production; graceful degradation if email/Redis is temporarily unavailable (core CRUD should not hard-fail) |
| **Scalability** | API must run as multiple stateless Uvicorn/Gunicorn workers behind a load balancer; database connection pooling required |
| **Maintainability** | Test suite (pytest) required for all new endpoints; CI should run tests + linting before merge |
| **Usability** | Auto-generated OpenAPI docs kept accurate and up to date |
| **Portability** | Configuration via environment variables only; no hard-coded secrets or paths |

---

## 6. Data Requirements

### 6.1 Core Entities (existing)
`User`, `Account`, `Category`, `Transaction`, `RecurringBill`, `SavingsGoal`

### 6.2 New Data Additions
- `User.email_verified` (boolean), `User.verification_token`, `User.reset_token` + expiry
- `RefreshToken` table or Redis-backed store, with revocation support
- Audit fields (`created_at`, `updated_at`) standardized across all tables

### 6.3 Data Privacy Considerations
- This system stores financial data. Even without bank integration, treat all transaction data as sensitive.
- Recommend encrypting sensitive fields at rest where supported by the hosting provider, and ensuring backups are encrypted.
- A Terms of Service and Privacy Policy should be published before public launch (legal review recommended — not covered in this SRS).

---

## 7. Updated Architecture Overview

```
Client
  │  HTTPS
  ▼
Load Balancer / Reverse Proxy
  │
  ▼
FastAPI (Gunicorn + Uvicorn workers)  ──►  PostgreSQL
  │            │                             (primary data store)
  │            └──►  Redis (rate limits, token blacklist, job broker)
  │
  └──►  Celery / APScheduler worker  ──►  generates recurring-bill transactions
                │
                └──►  SMTP/email API (verification, reset, notifications)

All components ──► Sentry (error monitoring)
```

---

## 8. Appendix

### 8.1 Recommended Dependency Additions
```
slowapi              # rate limiting
redis                # cache / rate-limit backend / Celery broker
celery               # background job execution
# or: apscheduler    # lighter-weight alternative to Celery for simple schedules
sentry-sdk            # error tracking
fastapi-mail          # verification / reset emails
gunicorn              # production process manager
pytest                # test framework
pytest-asyncio        # async test support
httpx                 # test client for FastAPI
faker                 # test data generation
```

### 8.2 Open Items / Next Steps
- Decide: Celery (more robust, needs a broker + worker) vs. APScheduler (simpler, in-process, less resilient to restarts)
- Decide on an email provider (SMTP vs. transactional API service)
- Legal review of Terms of Service / Privacy Policy before public launch
- Decide hosting target (e.g., managed container platform vs. VPS)

### 8.3 Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-08 | Initial draft covering existing scope + public-release add-ons |
