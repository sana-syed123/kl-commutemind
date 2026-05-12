from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.routers import routes, nlp
from app.workers.gtfs_poller import start_gtfs_poller

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run the poller in the background
    poller_task = asyncio.create_task(start_gtfs_poller())
    yield
    # Shutdown
    poller_task.cancel()

app = FastAPI(
    title="KL CommuteMind API",
    description="Backend API for KL Transit + Commute Optimizer",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api/routes", tags=["routing"])
app.include_router(nlp.router, prefix="/api/nl", tags=["nlp"])

@app.get("/")
def read_root():
    return {"message": "Welcome to KL CommuteMind API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
