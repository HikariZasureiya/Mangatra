from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import  token, users, translate

app = FastAPI(
    title="mangatra",
    description="manga panel translation with ocr"
)
origins = [
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(token.router, prefix="/token", tags=["token"])
app.include_router(translate.router , prefix="/translate" , tags=["translate"])
