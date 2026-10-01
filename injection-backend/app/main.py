from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import actions, health, interfaces, node, uart

app = FastAPI(
    title="Wiresploit Network Injection v0",
    description="Controlled, protocol-specific local network test prototype.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(interfaces.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(node.router, prefix="/api")
app.include_router(uart.router, prefix="/api")
