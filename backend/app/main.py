from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.routers import routes, nlp, stops, ors
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
    allow_origins=[
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
        'https://kl-commutemind.vercel.app',
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api/routes", tags=["routing"])
app.include_router(ors.router, prefix="/api/routes/ors", tags=["routing"])
app.include_router(nlp.router, prefix="/api/nl", tags=["nlp"])
app.include_router(stops.router, prefix="/api/stops", tags=["stops"])

@app.get("/")
def read_root():
    return {"message": "Welcome to KL CommuteMind API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
