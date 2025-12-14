from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import auth, audits, glossaries

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API for auditing localized website quality",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - parse comma-separated origins from settings
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(audits.router, prefix="/api")
app.include_router(glossaries.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Localization Auditor API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
