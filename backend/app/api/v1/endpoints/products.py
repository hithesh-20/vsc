from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.product import Product, Category
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, CategoryResponse
from app.schemas.common import APIResponse, MessageResponse

router = APIRouter()


@router.get("/categories", response_model=APIResponse[List[CategoryResponse]])
def get_categories(db: Session = Depends(get_db)):
    """List all available item categories."""
    categories = db.query(Category).all()
    return APIResponse(data=[CategoryResponse.model_validate(c) for c in categories])


@router.get("", response_model=APIResponse[List[ProductResponse]])
def list_vendor_products(
    category_id: Optional[str] = None,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """List all products belonging to the logged-in vendor."""
    query = db.query(Product).options(joinedload(Product.category)).filter(Product.vendor_id == vendor.id)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    products = query.order_by(Product.name_en).all()
    return APIResponse(data=[ProductResponse.model_validate(p) for p in products])


@router.post("", response_model=APIResponse[ProductResponse], status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new product in the vendor's catalog."""
    product = Product(
        vendor_id=vendor.id,
        category_id=product_in.category_id,
        name_en=product_in.name_en,
        name_kn=product_in.name_kn,
        description=product_in.description,
        unit=product_in.unit,
        cost_price=product_in.cost_price,
        selling_price=product_in.selling_price,
        current_stock=product_in.current_stock,
        low_stock_threshold=product_in.low_stock_threshold,
        image_url=product_in.image_url,
        is_perishable=product_in.is_perishable,
        is_available=True
    )
    db.add(product)
    db.flush()

    # Initial inventory ledger record
    if product.current_stock > 0:
        ledger = InventoryLedger(
            product_id=product.id,
            change_qty=product.current_stock,
            transaction_type=InventoryTransactionType.INITIAL,
            balance_after=product.current_stock,
            notes="Initial stock registration"
        )
        db.add(ledger)

    db.commit()
    db.refresh(product)
    return APIResponse(message="Product created successfully", data=ProductResponse.model_validate(product))


@router.put("/{product_id}", response_model=APIResponse[ProductResponse])
def update_product(
    product_id: str,
    update_in: ProductUpdate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update product details, pricing, or availability."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    for field, value in update_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return APIResponse(message="Product updated successfully", data=ProductResponse.model_validate(product))


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(
    product_id: str,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Delete a product from catalog."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()
    return MessageResponse(message="Product deleted successfully")
