from fastapi import FastAPI, Request, HTTPException, Depends, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
import json
import logging

# ----------------------------
# Logging
# ----------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ----------------------------
# Security / JWT
# ----------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Use bcrypt_sha256 to avoid 72-byte limitation and normalize inputs
pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


def _ensure_str(p) -> str:
    if isinstance(p, bytes):
        return p.decode("utf-8", errors="ignore")
    return str(p)


def hash_password(password: str) -> str:
    password = _ensure_str(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_ensure_str(plain_password), _ensure_str(hashed_password))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ----------------------------
# Paths
# ----------------------------
ROOT = Path(__file__).parent
DB = ROOT / "DB"
AUDIO_DIR = ROOT / "audio"
TRACK_DATA_FILE = DB / "tracks.json"
USER_DATA_FILE = DB / "users.json"
PLAYLIST_DATA_FILE = DB / "playlists.json"

# ----------------------------
# App setup
# ----------------------------
app = FastAPI(title="Spotifaux API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):(5173|3000)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Optional: clearer 422 responses in logs and JSON body
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Validation error on %s %s: %s", request.method, request.url, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Serve static audio files
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

# ----------------------------
# Load data
# ----------------------------
with open(TRACK_DATA_FILE, "r", encoding="utf-8") as f:
    RAW_TRACKS = json.load(f)
logger.info("Loaded %d tracks from %s", len(RAW_TRACKS), TRACK_DATA_FILE)

with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
    RAW_USERS = json.load(f)
logger.info("Loaded %d users from %s", len(RAW_USERS), USER_DATA_FILE)

try:
    with open(PLAYLIST_DATA_FILE, "r", encoding="utf-8") as f:
        RAW_PLAYLISTS = json.load(f)
except FileNotFoundError:
    RAW_PLAYLISTS = []
logger.info("Loaded %d playlists from %s", len(RAW_PLAYLISTS), PLAYLIST_DATA_FILE)

USERS_BY_EMAIL: Dict[str, Dict[str, Any]] = {u["email"].lower(): u for u in RAW_USERS}
TRACK_BY_ID: Dict[int, Dict[str, Any]] = {int(t["id"]): t for t in RAW_TRACKS}

# ----------------------------
# Helpers: file persistence
# ----------------------------
def save_users_to_file() -> None:
    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(RAW_USERS, f, ensure_ascii=False, indent=2)


def save_playlists_to_file() -> None:
    with open(PLAYLIST_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(RAW_PLAYLISTS, f, ensure_ascii=False, indent=2)


def next_user_id() -> int:
    return max((int(u["id"]) for u in RAW_USERS), default=0) + 1


def next_playlist_id() -> int:
    return max((int(p["id"]) for p in RAW_PLAYLISTS), default=0) + 1


# ----------------------------
# Auth (JWT via httpOnly cookie)
# ----------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""


class PublicUser(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: Optional[str] = "user"


class LoginOut(BaseModel):
    access_token: Optional[str] = None  # kept for compatibility if FE expects it
    token_type: str = "bearer"
    user: PublicUser


def to_public_user(user: Dict[str, Any]) -> PublicUser:
    return PublicUser(
        id=int(user["id"]),
        email=user["email"],
        name=user.get("name", ""),
        role=user.get("role", "user"),
    )


def get_current_user(access_token: Optional[str] = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    for u in RAW_USERS:
        if int(u["id"]) == int(uid):
            return u
    raise HTTPException(status_code=401, detail="User not found")


@app.post("/auth/signup", response_model=LoginOut)
def signup(body: SignupIn, response: Response):
    email = body.email.lower().strip()
    if email in USERS_BY_EMAIL:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_user = {
        "id": next_user_id(),
        "email": email,
        "password": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "role": "user",
    }
    RAW_USERS.append(new_user)
    USERS_BY_EMAIL[email] = new_user
    save_users_to_file()
    logger.info("User signup: %s (id=%s)", email, new_user["id"])

    token = create_access_token({"sub": str(new_user["id"])})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=os.getenv("COOKIE_SAMESITE", "lax"),  # use "none" with HTTPS cross-site
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )
    return LoginOut(access_token=token, user=to_public_user(new_user))


@app.post("/auth/login", response_model=LoginOut)
def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = USERS_BY_EMAIL.get(email)
    if not user or not verify_password(body.password, user.get("password", "")):
        logger.info("Failed login for %s", body.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"])})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=os.getenv("COOKIE_SAMESITE", "lax"),
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )
    logger.info("User %s logged in (id=%s)", body.email, user["id"])
    return LoginOut(access_token=token, user=to_public_user(user))


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    logger.info("Logout cookie cleared")
    return {"ok": True}


@app.get("/auth/me", response_model=PublicUser)
def me(current=Depends(get_current_user)):
    return to_public_user(current)


# ----------------------------
# Tracks
# ----------------------------
def absolute_audio_url(request: Request, filename: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/audio/{filename}"


def serialize_track(request: Request, t: dict) -> dict:
    out = {k: v for k, v in t.items() if k != "preview_file"}
    out["preview"] = absolute_audio_url(request, t["preview_file"])
    return out


@app.get("/tracks")
def list_tracks(request: Request):
    logger.info("GET /tracks called")
    return [serialize_track(request, t) for t in RAW_TRACKS]


@app.get("/search")
def search_tracks(q: str, request: Request):
    logger.info("GET /search called with query: %s", q)
    ql = q.lower()
    filtered = [
        t for t in RAW_TRACKS
        if ql in t["title"].lower() or ql in t["artist"].lower()
    ]
    logger.info("Search returned %d results", len(filtered))
    return [serialize_track(request, t) for t in filtered]


# ----------------------------
# Playlists (CRUD)
# ----------------------------
class PlaylistIn(BaseModel):
    name: str
    tracks: list[int] = []


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    tracks: Optional[list[int]] = None


class PlaylistOut(BaseModel):
    id: int
    user_id: int
    name: str
    tracks: list[dict]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def validate_track_ids(track_ids):
    bad = [tid for tid in track_ids if int(tid) not in TRACK_BY_ID]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown track ids: {bad}")


def populate_playlist(request: Request, pl: dict) -> dict:
    enriched = {k: v for k, v in pl.items()}
    tracks_full = []
    for tid in pl.get("tracks", []):
        t = TRACK_BY_ID.get(int(tid))
        if t:
            tracks_full.append(serialize_track(request, t))
    enriched["tracks"] = tracks_full
    return enriched


def get_playlist_or_404(pid: int) -> dict:
    for p in RAW_PLAYLISTS:
        if int(p["id"]) == int(pid):
            return p
    raise HTTPException(status_code=404, detail="Playlist not found")


def assert_owner(playlist: dict, user: dict):
    if int(playlist.get("user_id")) != int(user["id"]):
        raise HTTPException(status_code=403, detail="Forbidden")


@app.get("/playlists", response_model=list[PlaylistOut])
def list_playlists(request: Request, current=Depends(get_current_user)):
    user_id = int(current["id"])
    own = [p for p in RAW_PLAYLISTS if int(p.get("user_id")) == user_id]
    return [populate_playlist(request, p) for p in own]


@app.get("/playlists/{pid}", response_model=PlaylistOut)
def get_playlist(pid: int, request: Request, current=Depends(get_current_user)):
    pl = get_playlist_or_404(pid)
    assert_owner(pl, current)
    return populate_playlist(request, pl)


@app.post("/playlists", response_model=PlaylistOut, status_code=201)
def create_playlist(body: PlaylistIn, request: Request, current=Depends(get_current_user)):
    validate_track_ids(body.tracks)
    now = datetime.utcnow().isoformat() + "Z"
    new_pl = {
        "id": next_playlist_id(),
        "user_id": int(current["id"]),
        "name": body.name.strip(),
        "tracks": [int(t) for t in body.tracks],
        "created_at": now,
        "updated_at": now,
    }
    RAW_PLAYLISTS.append(new_pl)
    save_playlists_to_file()
    logger.info("Playlist created id=%s by user_id=%s", new_pl["id"], current["id"])
    return populate_playlist(request, new_pl)


@app.put("/playlists/{pid}", response_model=PlaylistOut)
def update_playlist(pid: int, body: PlaylistUpdate, request: Request, current=Depends(get_current_user)):
    pl = get_playlist_or_404(pid)
    assert_owner(pl, current)

    if body.name is not None:
        pl["name"] = body.name.strip()
    if body.tracks is not None:
        validate_track_ids(body.tracks)
        pl["tracks"] = [int(t) for t in body.tracks]

    pl["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_playlists_to_file()
    logger.info("Playlist updated id=%s by user_id=%s", pl["id"], current["id"])
    return populate_playlist(request, pl)


@app.delete("/playlists/{pid}", status_code=204)
def delete_playlist(pid: int, current=Depends(get_current_user)):
    pl = get_playlist_or_404(pid)
    assert_owner(pl, current)
    for i, p in enumerate(RAW_PLAYLISTS):
        if int(p["id"]) == int(pid):
            RAW_PLAYLISTS.pop(i)
            break
    save_playlists_to_file()
    logger.info("Playlist deleted id=%s by user_id=%s", pid, current["id"])
    return
