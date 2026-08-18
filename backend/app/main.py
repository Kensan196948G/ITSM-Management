from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings as cfg
from app.db.base import Base
from app.db.session import engine
from app.routers import assets, audit_logs, auth, changes, cmdb, dashboard, export, incidents, knowledge, patches, problems, security_events, service_requests, settings, users

if cfg.debug:
    # 開発環境のみ自動作成；本番はalembic upgrade headを使用
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=cfg.app_name,
    version=cfg.app_version,
    docs_url="/api/docs" if cfg.debug else None,
    redoc_url="/api/redoc" if cfg.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(incidents.router)
app.include_router(dashboard.router)
app.include_router(export.router)
app.include_router(audit_logs.router)
app.include_router(problems.router)
app.include_router(changes.router)
app.include_router(cmdb.router)
app.include_router(knowledge.router)
app.include_router(assets.router)
app.include_router(patches.router)
app.include_router(security_events.router)
app.include_router(service_requests.router)
app.include_router(settings.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": cfg.app_version}
