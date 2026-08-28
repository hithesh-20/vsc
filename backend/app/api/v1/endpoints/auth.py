from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token, oauth2_scheme
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, Token, UserResponse
from app.schemas.common import APIResponse

router = APIRouter()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency: decode JWT and return active User instance."""
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found or deactivated",
        )
    return user


def get_current_vendor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Vendor:
    """Dependency: ensure current user has a Vendor profile."""
    if current_user.role != UserRole.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to registered Vendors only"
        )
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found for this account"
        )
    return vendor


@router.post("/register", response_model=APIResponse[Token])
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new Vendor or Customer account."""
    existing = db.query(User).filter(User.phone == request.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered. Please login."
        )

    user = User(
        phone=request.phone,
        hashed_password=get_password_hash(request.password),
        role=request.role,
        language_pref=request.language_pref,
        is_active=True
    )
    db.add(user)
    db.flush()

    vendor_id = None
    customer_id = None
    name = "User"

    if request.role == UserRole.VENDOR:
        vendor = Vendor(
            user_id=user.id,
            business_name=request.business_name or "My Local Shop",
            business_category=request.business_category or "Vegetables",
            operating_location=request.operating_location or "Main Street Market",
            current_lat=12.9716,
            current_lon=77.5946
        )
        db.add(vendor)
        db.flush()
        vendor_id = vendor.id
        name = vendor.business_name
    elif request.role == UserRole.CUSTOMER:
        customer = Customer(
            user_id=user.id,
            full_name=request.full_name or "Local Customer",
            delivery_address=request.delivery_address or "Bangalore",
            default_lat=12.9716,
            default_lon=77.5946
        )
        db.add(customer)
        db.flush()
        customer_id = customer.id
        name = customer.full_name

    db.commit()

    token_str = create_access_token(subject=user.id)
    token_data = Token(
        access_token=token_str,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        vendor_id=vendor_id,
        customer_id=customer_id,
        name=name,
        language_pref=user.language_pref.value
    )

    return APIResponse(
        success=True,
        message="Registration completed successfully",
        data=token_data
    )


@router.post("/login", response_model=APIResponse[Token])
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate via Phone and Password/PIN."""
    user = db.query(User).filter(User.phone == request.phone).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password/PIN"
        )

    vendor_id = None
    customer_id = None
    name = "User"

    if user.role == UserRole.VENDOR and user.vendor:
        vendor_id = user.vendor.id
        name = user.vendor.business_name
    elif user.role == UserRole.CUSTOMER and user.customer:
        customer_id = user.customer.id
        name = user.customer.full_name

    token_str = create_access_token(subject=user.id)
    token_data = Token(
        access_token=token_str,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        vendor_id=vendor_id,
        customer_id=customer_id,
        name=name,
        language_pref=user.language_pref.value
    )

    return APIResponse(
        success=True,
        message="Login successful",
        data=token_data
    )


@router.get("/me", response_model=APIResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return APIResponse(data=UserResponse.model_validate(current_user))
