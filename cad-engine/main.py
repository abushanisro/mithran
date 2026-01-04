"""
CAD Engine - STEP to STL Conversion Service

Professional implementation using OpenCascade (pythonocc-core)
Refactored with clean code principles, SOLID design, and security best practices

Author: mithran Platform
Standards: ISO 10303 (STEP), STL Binary Format
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn

from config import AppConfig
from services import StepReader, ShapeMesher, StlWriter, ConversionService
from validators import FileValidator
from exceptions import (
    CADEngineException,
    FileValidationError,
    ConversionError
)

# ============================================================================
# CONFIGURATION & LOGGING
# ============================================================================

# Load configuration from environment
config = AppConfig.from_env()
config.validate()

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Log startup configuration (sanitized)
logger.info(f"Starting CAD Engine in {config.environment} mode")
logger.info(f"Port: {config.port}")
logger.info(f"Max file size: {config.max_file_size_bytes / (1024 * 1024):.2f}MB")
logger.info(f"Rate limit: {config.rate_limit_per_minute} requests/minute")
logger.info(f"CORS origins: {config.cors_origins}")

# ============================================================================
# RATE LIMITING
# ============================================================================

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# ============================================================================
# APPLICATION LIFECYCLE
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown"""
    
    # Startup
    logger.info("Initializing CAD Engine services...")
    
    # Create temp directory if it doesn't exist
    os.makedirs(config.temp_dir, exist_ok=True)
    logger.info(f"Temp directory: {config.temp_dir}")
    
    # Initialize services with dependency injection
    step_reader = StepReader()
    shape_mesher = ShapeMesher(
        linear_deflection=config.linear_deflection,
        angular_deflection=config.angular_deflection
    )
    stl_writer = StlWriter(ascii_mode=False)  # Binary STL for smaller files
    
    # Create conversion service
    conversion_service = ConversionService(
        step_reader=step_reader,
        shape_mesher=shape_mesher,
        stl_writer=stl_writer
    )
    
    # Create file validator
    file_validator = FileValidator(
        max_file_size_bytes=config.max_file_size_bytes
    )
    
    # Store in app state
    app.state.conversion_service = conversion_service
    app.state.file_validator = file_validator
    app.state.config = config
    
    logger.info("CAD Engine services initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CAD Engine...")
    # Cleanup if needed

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="mithran CAD Engine",
    description="Professional STEP to STL conversion service with security and rate limiting",
    version="2.0.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================================
# MIDDLEWARE
# ============================================================================

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def cleanup_files(*file_paths):
    """
    Background task to cleanup temporary files after response is sent
    """
    for file_path in file_paths:
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.info(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Cleanup error for {file_path}: {str(e)}")

# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.get("/")
async def root() -> Dict:
    """Root endpoint - service information"""
    return {
        "service": "mithran CAD Engine",
        "status": "running",
        "version": "2.0.0",
        "engine": "OpenCascade Technology (OCCT)",
        "environment": config.environment
    }


@app.get("/health")
async def health() -> Dict:
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "opencascade": "pythonocc-core 7.7.2",
        "capabilities": ["STEP", "IGES", "STL"],
        "limits": {
            "max_file_size_mb": config.max_file_size_bytes / (1024 * 1024),
            "rate_limit_per_minute": config.rate_limit_per_minute
        },
        "conversion_settings": {
            "linear_deflection": config.linear_deflection,
            "angular_deflection": config.angular_deflection
        }
    }

# ============================================================================
# CONVERSION ENDPOINTS
# ============================================================================

@app.post("/convert/step-to-stl")
@limiter.limit(f"{config.rate_limit_per_minute}/minute")
async def convert_step_to_stl(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
) -> FileResponse:
    """
    Convert STEP file to STL with security validation
    
    Security features:
    - File size validation
    - File type validation (extension + magic number)
    - Rate limiting
    - Automatic cleanup
    
    Args:
        request: FastAPI request (for rate limiting)
        background_tasks: Background task manager
        file: Uploaded STEP/IGES file
        
    Returns:
        STL file (binary format)
        
    Raises:
        HTTPException: On validation or conversion errors
    """
    conversion_service: ConversionService = request.app.state.conversion_service
    file_validator: FileValidator = request.app.state.file_validator
    
    logger.info(f"Received conversion request: {file.filename} from {get_remote_address(request)}")
    
    step_path = None
    stl_path = None
    
    try:
        # Create temporary file for uploaded content
        file_ext = Path(file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, dir=config.temp_dir) as temp_step:
            step_path = temp_step.name
            
            # Write uploaded file to temp location
            content = await file.read()
            temp_step.write(content)
            temp_step.flush()
        
        # Validate file (size, extension, magic number)
        try:
            validated_ext, file_size = file_validator.validate_file(step_path, file.filename)
            logger.info(f"File validated: {file.filename} ({file_size} bytes)")
        except FileValidationError as e:
            cleanup_files(step_path)
            logger.warning(f"File validation failed: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        
        # Create output STL path
        stl_path = str(Path(step_path).with_suffix('.stl'))
        
        # Convert STEP to STL
        try:
            output_path = conversion_service.convert(step_path, stl_path)
            logger.info(f"Conversion successful: {file.filename} → STL")
        except ConversionError as e:
            cleanup_files(step_path, stl_path)
            logger.error(f"Conversion failed: {str(e)}")
            raise HTTPException(
                status_code=422,
                detail=f"Conversion failed: {str(e)}"
            )
        
        # Schedule cleanup after response is sent
        background_tasks.add_task(cleanup_files, step_path, stl_path)
        
        # Return STL file
        return FileResponse(
            output_path,
            media_type="application/octet-stream",
            filename=Path(file.filename).stem + ".stl",
            headers={
                "X-Original-Filename": file.filename,
                "X-Conversion-Engine": "OpenCascade",
                "X-File-Size": str(os.path.getsize(output_path)),
                "X-Mesh-Quality": f"linear={config.linear_deflection},angular={config.angular_deflection}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Cleanup on unexpected error
        cleanup_files(step_path, stl_path)
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error during conversion"
        )


@app.post("/convert/step-to-stl-base64")
@limiter.limit(f"{config.rate_limit_per_minute}/minute")
async def convert_step_to_stl_base64(
    request: Request,
    file: UploadFile = File(...)
) -> Dict:
    """
    Convert STEP file to STL and return as base64
    
    Useful for direct embedding in responses or APIs
    
    Args:
        request: FastAPI request (for rate limiting)
        file: Uploaded STEP/IGES file
        
    Returns:
        JSON with base64-encoded STL data
        
    Raises:
        HTTPException: On validation or conversion errors
    """
    import base64
    
    conversion_service: ConversionService = request.app.state.conversion_service
    file_validator: FileValidator = request.app.state.file_validator
    
    logger.info(f"Received base64 conversion request: {file.filename}")
    
    step_path = None
    stl_path = None
    
    try:
        # Create temporary file
        file_ext = Path(file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, dir=config.temp_dir) as temp_step:
            step_path = temp_step.name
            content = await file.read()
            temp_step.write(content)
            temp_step.flush()
        
        # Validate file
        try:
            validated_ext, file_size = file_validator.validate_file(step_path, file.filename)
        except FileValidationError as e:
            cleanup_files(step_path)
            raise HTTPException(status_code=400, detail=str(e))
        
        stl_path = str(Path(step_path).with_suffix('.stl'))
        
        # Convert
        try:
            output_path = conversion_service.convert(step_path, stl_path)
        except ConversionError as e:
            cleanup_files(step_path, stl_path)
            raise HTTPException(status_code=422, detail=f"Conversion failed: {str(e)}")
        
        # Read STL and encode to base64
        with open(output_path, 'rb') as f:
            stl_data = f.read()
        
        stl_base64 = base64.b64encode(stl_data).decode('utf-8')
        
        return {
            "success": True,
            "original_filename": file.filename,
            "stl_filename": Path(file.filename).stem + ".stl",
            "stl_size": len(stl_data),
            "stl_base64": stl_base64,
            "mesh_quality": {
                "linear_deflection": config.linear_deflection,
                "angular_deflection": config.angular_deflection
            }
        }
    
    finally:
        # Always cleanup
        cleanup_files(step_path, stl_path)


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(CADEngineException)
async def cad_engine_exception_handler(request: Request, exc: CADEngineException):
    """Handle CAD engine specific exceptions"""
    logger.error(f"CAD Engine error: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "CAD Engine Error",
            "detail": str(exc),
            "type": exc.__class__.__name__
        }
    )

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    logger.info(f"Starting CAD Engine on {config.host}:{config.port}")
    
    uvicorn.run(
        "main:app",
        host=config.host,
        port=config.port,
        reload=(config.environment == "development"),
        log_level=config.log_level.lower(),
        access_log=True
    )
