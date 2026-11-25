"""JobsQ: the FastAPI app."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import config, db
from .routers import account, auth, channels, connector, resume, webhooks, work

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    yield
    db.pool.close()


app = FastAPI(title="JobsQ API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[config.WEB_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, account.router, resume.router, channels.router, connector.router, webhooks.router, work.router):
    app.include_router(r)


@app.get("/healthz")
def healthz():
    return {"ok": True}
