from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.api_router import api_router
from app.utils.seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager: initialize database schemas and demo seed data."""
    print("Starting VendorSaathi Backend Engine...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    print("Shutting down VendorSaathi Backend Engine...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Driven Voice Commerce & Intelligent Mobility Platform for Local, Street, Rural, and Mobile Vendors",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Next.js Customer Web Portal and Flutter Web/Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def health_check():
    """System health check and diagnostic endpoint."""
    return {
        "status": "online",
        "platform": "VendorSaathi API",
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
        "docs_url": "/docs",
        "api_v1_root": settings.API_V1_STR
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
