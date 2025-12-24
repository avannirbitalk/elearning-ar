from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'elearning-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="E-Learning Platform API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRole:
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class MaterialType:
    TEXT = "TEXT"
    FILE = "FILE"
    VIDEO = "VIDEO"
    MODEL3D = "MODEL3D"

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # TEACHER or STUDENT

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar: Optional[str] = None
    createdAt: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str

# Classroom Models
class ClassroomCreate(BaseModel):
    name: str
    description: Optional[str] = None
    subject: str
    coverImage: Optional[str] = None

class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    coverImage: Optional[str] = None
    isActive: Optional[bool] = None

class JoinClassroom(BaseModel):
    code: str

# Material Models
class MaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str  # TEXT, FILE, VIDEO, MODEL3D
    content: Optional[str] = None  # For TEXT type
    fileUrl: Optional[str] = None  # For FILE type
    fileName: Optional[str] = None
    videoUrl: Optional[str] = None  # For VIDEO type
    modelUrl: Optional[str] = None  # For MODEL3D type (.glb file)
    arEnabled: Optional[bool] = True  # Enable AR for MODEL3D
    modelScale: Optional[float] = 1.0  # Scale for 3D model
    isPublished: Optional[bool] = True

class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    videoUrl: Optional[str] = None
    modelUrl: Optional[str] = None
    arEnabled: Optional[bool] = None
    modelScale: Optional[float] = None
    isPublished: Optional[bool] = None
    order: Optional[int] = None

class ReorderMaterials(BaseModel):
    materialIds: List[str]

# ==================== HELPER FUNCTIONS ====================

def generate_code(length=6):
    """Generate a random code for classroom"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserCreate):
    """Register a new user"""
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if data.role not in [UserRole.TEACHER, UserRole.STUDENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "avatar": None,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, data.email, data.role)
    
    return AuthResponse(
        user=UserResponse(
            id=user_id,
            email=data.email,
            name=data.name,
            role=data.role,
            avatar=None,
            createdAt=now
        ),
        token=token
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return AuthResponse(
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            avatar=user.get("avatar"),
            createdAt=user["createdAt"]
        ),
        token=token
    )

@api_router.get("/auth/profile", response_model=UserResponse)
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        avatar=user.get("avatar"),
        createdAt=user["createdAt"]
    )

@api_router.patch("/auth/profile", response_model=UserResponse)
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.avatar is not None:
        update_data["avatar"] = data.avatar
    
    if update_data:
        update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user["role"],
        avatar=updated_user.get("avatar"),
        createdAt=updated_user["createdAt"]
    )

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    """Change user password"""
    if not verify_password(data.currentPassword, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(data.newPassword)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": new_hash, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Password changed successfully"}

# ==================== CLASSROOM ROUTES ====================

@api_router.get("/classrooms")
async def get_classrooms(user: dict = Depends(get_current_user)):
    """Get all classrooms for current user"""
    if user["role"] == UserRole.TEACHER:
        # Get classrooms created by teacher
        classrooms = await db.classrooms.find({"teacherId": user["id"]}).to_list(100)
    else:
        # Get enrolled classrooms for student
        enrollments = await db.enrollments.find({"studentId": user["id"]}).to_list(100)
        classroom_ids = [e["classroomId"] for e in enrollments]
        classrooms = await db.classrooms.find({"id": {"$in": classroom_ids}}).to_list(100)
    
    # Add counts and teacher info
    result = []
    for c in classrooms:
        enrollment_count = await db.enrollments.count_documents({"classroomId": c["id"]})
        material_count = await db.materials.count_documents({"classroomId": c["id"]})
        teacher = await db.users.find_one({"id": c["teacherId"]})
        
        c["_count"] = {
            "enrollments": enrollment_count,
            "materials": material_count
        }
        c["teacher"] = {
            "id": teacher["id"],
            "name": teacher["name"],
            "email": teacher["email"]
        } if teacher else None
        
        # Remove MongoDB _id
        c.pop("_id", None)
        result.append(c)
    
    return result

@api_router.post("/classrooms")
async def create_classroom(data: ClassroomCreate, user: dict = Depends(get_current_user)):
    """Create a new classroom (teacher only)"""
    if user["role"] != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create classrooms")
    
    classroom_id = str(uuid.uuid4())
    code = generate_code()
    now = datetime.now(timezone.utc).isoformat()
    
    # Ensure unique code
    while await db.classrooms.find_one({"code": code}):
        code = generate_code()
    
    classroom_doc = {
        "id": classroom_id,
        "name": data.name,
        "description": data.description,
        "subject": data.subject,
        "code": code,
        "coverImage": data.coverImage,
        "isActive": True,
        "teacherId": user["id"],
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.classrooms.insert_one(classroom_doc)
    classroom_doc.pop("_id", None)
    classroom_doc["_count"] = {"enrollments": 0, "materials": 0}
    classroom_doc["teacher"] = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"]
    }
    
    return classroom_doc

@api_router.get("/classrooms/{id}")
async def get_classroom(id: str, user: dict = Depends(get_current_user)):
    """Get classroom by ID"""
    classroom = await db.classrooms.find_one({"id": id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check access
    if user["role"] == UserRole.TEACHER:
        if classroom["teacherId"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        enrollment = await db.enrollments.find_one({
            "studentId": user["id"],
            "classroomId": id
        })
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this classroom")
    
    # Add counts and teacher info
    enrollment_count = await db.enrollments.count_documents({"classroomId": id})
    material_count = await db.materials.count_documents({"classroomId": id})
    teacher = await db.users.find_one({"id": classroom["teacherId"]})
    
    classroom["_count"] = {
        "enrollments": enrollment_count,
        "materials": material_count
    }
    classroom["teacher"] = {
        "id": teacher["id"],
        "name": teacher["name"],
        "email": teacher["email"]
    } if teacher else None
    
    classroom.pop("_id", None)
    return classroom

@api_router.put("/classrooms/{id}")
async def update_classroom(id: str, data: ClassroomUpdate, user: dict = Depends(get_current_user)):
    """Update classroom (teacher only)"""
    classroom = await db.classrooms.find_one({"id": id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.subject is not None:
        update_data["subject"] = data.subject
    if data.coverImage is not None:
        update_data["coverImage"] = data.coverImage
    if data.isActive is not None:
        update_data["isActive"] = data.isActive
    
    if update_data:
        update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.classrooms.update_one({"id": id}, {"$set": update_data})
    
    updated = await db.classrooms.find_one({"id": id})
    updated.pop("_id", None)
    return updated

@api_router.delete("/classrooms/{id}")
async def delete_classroom(id: str, user: dict = Depends(get_current_user)):
    """Delete classroom (teacher only)"""
    classroom = await db.classrooms.find_one({"id": id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete related data
    await db.enrollments.delete_many({"classroomId": id})
    await db.materials.delete_many({"classroomId": id})
    await db.classrooms.delete_one({"id": id})
    
    return {"message": "Classroom deleted"}

@api_router.post("/classrooms/join")
async def join_classroom(data: JoinClassroom, user: dict = Depends(get_current_user)):
    """Join classroom with code (student only)"""
    if user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can join classrooms")
    
    classroom = await db.classrooms.find_one({"code": data.code.upper()})
    if not classroom:
        raise HTTPException(status_code=404, detail="Invalid classroom code")
    
    if not classroom.get("isActive", True):
        raise HTTPException(status_code=400, detail="Classroom is not active")
    
    # Check if already enrolled
    existing = await db.enrollments.find_one({
        "studentId": user["id"],
        "classroomId": classroom["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this classroom")
    
    enrollment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    await db.enrollments.insert_one({
        "id": enrollment_id,
        "studentId": user["id"],
        "classroomId": classroom["id"],
        "joinedAt": now
    })
    
    classroom.pop("_id", None)
    return {"classroom": classroom}

@api_router.delete("/classrooms/{id}/leave")
async def leave_classroom(id: str, user: dict = Depends(get_current_user)):
    """Leave classroom (student only)"""
    if user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can leave classrooms")
    
    result = await db.enrollments.delete_one({
        "studentId": user["id"],
        "classroomId": id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not enrolled in this classroom")
    
    return {"message": "Left classroom"}

@api_router.get("/classrooms/{id}/students")
async def get_classroom_students(id: str, user: dict = Depends(get_current_user)):
    """Get students in classroom (teacher only)"""
    classroom = await db.classrooms.find_one({"id": id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    enrollments = await db.enrollments.find({"classroomId": id}).to_list(100)
    
    students = []
    for e in enrollments:
        student = await db.users.find_one({"id": e["studentId"]})
        if student:
            students.append({
                "id": student["id"],
                "email": student["email"],
                "name": student["name"],
                "avatar": student.get("avatar"),
                "joinedAt": e["joinedAt"]
            })
    
    return students

# ==================== MATERIAL ROUTES ====================

@api_router.get("/materials/classroom/{classroomId}")
async def get_materials(classroomId: str, user: dict = Depends(get_current_user)):
    """Get materials for a classroom"""
    classroom = await db.classrooms.find_one({"id": classroomId})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check access
    if user["role"] == UserRole.TEACHER:
        if classroom["teacherId"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        enrollment = await db.enrollments.find_one({
            "studentId": user["id"],
            "classroomId": classroomId
        })
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")
    
    # Build query
    query = {"classroomId": classroomId}
    if user["role"] == UserRole.STUDENT:
        query["isPublished"] = True
    
    materials = await db.materials.find(query).sort("order", 1).to_list(100)
    
    # Add creator info
    for m in materials:
        creator = await db.users.find_one({"id": m["createdById"]})
        m["createdBy"] = {"id": creator["id"], "name": creator["name"]} if creator else None
        m.pop("_id", None)
    
    return materials

@api_router.get("/materials/{id}")
async def get_material(id: str, user: dict = Depends(get_current_user)):
    """Get material by ID"""
    material = await db.materials.find_one({"id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    classroom = await db.classrooms.find_one({"id": material["classroomId"]})
    
    # Check access
    if user["role"] == UserRole.TEACHER:
        if classroom["teacherId"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        enrollment = await db.enrollments.find_one({
            "studentId": user["id"],
            "classroomId": material["classroomId"]
        })
        if not enrollment or not material.get("isPublished", True):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    creator = await db.users.find_one({"id": material["createdById"]})
    material["createdBy"] = {"id": creator["id"], "name": creator["name"]} if creator else None
    material.pop("_id", None)
    
    return material

@api_router.post("/materials/classroom/{classroomId}")
async def create_material(classroomId: str, data: MaterialCreate, user: dict = Depends(get_current_user)):
    """Create material (teacher only)"""
    classroom = await db.classrooms.find_one({"id": classroomId})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if data.type not in [MaterialType.TEXT, MaterialType.FILE, MaterialType.VIDEO, MaterialType.MODEL3D]:
        raise HTTPException(status_code=400, detail="Invalid material type")
    
    # Get max order
    last_material = await db.materials.find_one(
        {"classroomId": classroomId},
        sort=[("order", -1)]
    )
    next_order = (last_material["order"] + 1) if last_material else 1
    
    material_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    material_doc = {
        "id": material_id,
        "title": data.title,
        "description": data.description,
        "type": data.type,
        "content": data.content,
        "fileUrl": data.fileUrl,
        "fileName": data.fileName,
        "videoUrl": data.videoUrl,
        "modelUrl": data.modelUrl,
        "arEnabled": data.arEnabled if data.arEnabled is not None else True,
        "modelScale": data.modelScale if data.modelScale is not None else 1.0,
        "order": next_order,
        "isPublished": data.isPublished if data.isPublished is not None else True,
        "classroomId": classroomId,
        "createdById": user["id"],
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.materials.insert_one(material_doc)
    material_doc.pop("_id", None)
    material_doc["createdBy"] = {"id": user["id"], "name": user["name"]}
    
    return material_doc

@api_router.put("/materials/{id}")
async def update_material(id: str, data: MaterialUpdate, user: dict = Depends(get_current_user)):
    """Update material (teacher only)"""
    material = await db.materials.find_one({"id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    classroom = await db.classrooms.find_one({"id": material["classroomId"]})
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {}
    for field in ["title", "description", "type", "content", "fileUrl", "fileName", 
                  "videoUrl", "modelUrl", "arEnabled", "modelScale", "isPublished", "order"]:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await db.materials.update_one({"id": id}, {"$set": update_data})
    
    updated = await db.materials.find_one({"id": id})
    updated.pop("_id", None)
    
    creator = await db.users.find_one({"id": updated["createdById"]})
    updated["createdBy"] = {"id": creator["id"], "name": creator["name"]} if creator else None
    
    return updated

@api_router.delete("/materials/{id}")
async def delete_material(id: str, user: dict = Depends(get_current_user)):
    """Delete material (teacher only)"""
    material = await db.materials.find_one({"id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    classroom = await db.classrooms.find_one({"id": material["classroomId"]})
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.materials.delete_one({"id": id})
    return {"message": "Material deleted"}

@api_router.post("/materials/classroom/{classroomId}/reorder")
async def reorder_materials(classroomId: str, data: ReorderMaterials, user: dict = Depends(get_current_user)):
    """Reorder materials (teacher only)"""
    classroom = await db.classrooms.find_one({"id": classroomId})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if classroom["teacherId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for index, material_id in enumerate(data.materialIds):
        await db.materials.update_one(
            {"id": material_id},
            {"$set": {"order": index + 1}}
        )
    
    return {"message": "Materials reordered"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "E-Learning Platform API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    """Create indexes on startup"""
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.classrooms.create_index("id", unique=True)
    await db.classrooms.create_index("code", unique=True)
    await db.enrollments.create_index("id", unique=True)
    await db.enrollments.create_index([("studentId", 1), ("classroomId", 1)], unique=True)
    await db.materials.create_index("id", unique=True)
    await db.materials.create_index("classroomId")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
