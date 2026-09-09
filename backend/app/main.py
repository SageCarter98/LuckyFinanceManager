from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, engine
from app.dependencies import get_current_user
from app.models import User
from app.routers.accounts import router as accounts_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.notifications import router as notifications_router
from app.routers.portability import router as portability_router
from app.routers.recurring_bills import router as recurring_bills_router
from app.routers.reports import router as reports_router
from app.routers.savings_goals import router as savings_goals_router
from app.routers.transactions import router as transactions_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    yield


app = FastAPI(title="Finance Management Platform", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


app.include_router(auth_router, prefix="/api")
app.include_router(accounts_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(recurring_bills_router, prefix="/api")
app.include_router(savings_goals_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(portability_router, prefix="/api")


@app.get("/health")
def healthcheck():
    return {"status": "ok", "environment": settings.environment, "database_url": settings.database_url}


@app.get("/me", response_model=dict)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "tenant_id": current_user.tenant_id,
        "email_verified": current_user.email_verified,
    }


@app.get("/")
def root():
    return {"message": "Finance Management Platform API"}
