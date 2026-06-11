from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    JSON,
    Boolean,
    DateTime,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from utils import sanitize_html, sanitize_description


class ProductDB(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    category = Column(String)
    image = Column(String)
    specs = Column(JSON)  # Store specs as JSON
    skv = Column(String, unique=True, nullable=True)  # Seller Known Value
    mrp = Column(Float, nullable=True)  # Maximum Retail Price
    sale_price = Column(Float, nullable=True)  # Discounted Price
    features = Column(JSON, nullable=True)  # Bullet points
    stock = Column(Integer, default=100)  # Real Stock Quantity


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="user")  # 'admin' or 'user'
    is_active = Column(Boolean, default=True)
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)

    refresh_tokens = relationship(
        "RefreshTokenDB", back_populates="user", cascade="all, delete-orphan"
    )
    wishlist_items = relationship(
        "WishlistItemDB", back_populates="user", cascade="all, delete-orphan"
    )
    cart_items = relationship(
        "CartItemDB", back_populates="user", cascade="all, delete-orphan"
    )


class OrderItemDB(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    bundle_id = Column(Integer, ForeignKey("bundles.id"), nullable=True)
    quantity = Column(Integer)
    price_at_purchase = Column(Float)  # Lock price at time of order

    order = relationship("OrderDB", back_populates="items")
    product = relationship("ProductDB")


class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_email = Column(String, index=True)
    total_amount = Column(Float)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to OrderItemDB
    items = relationship(
        "OrderItemDB", back_populates="order", cascade="all, delete-orphan"
    )

    # Coupon & Discount
    coupon_code = Column(String, nullable=True)
    discount_amount = Column(Float, default=0.0)

    # Payment & Shipping Details
    txnid = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address_line = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)


# Pydantic Schemas (API Request/Response)
class ProductBase(BaseModel):
    title: str
    description: str

    @field_validator("title", mode="before")
    @classmethod
    def sanitize_title(cls, v):
        return sanitize_html(v)

    @field_validator("description", mode="before")
    @classmethod
    def sanitize_desc(cls, v):
        return sanitize_description(v)

    price: float
    category: str
    image: Optional[str] = None
    specs: Optional[Dict[str, str]] = None
    skv: Optional[str] = None
    mrp: Optional[float] = None
    sale_price: Optional[float] = None
    features: Optional[List[str]] = None
    stock: int = 0

    @field_validator("specs", mode="before")
    @classmethod
    def parse_specs(cls, v):
        if isinstance(v, str):
            import json

            try:
                return json.loads(v)
            except:
                pass
        return v

    @field_validator("features", mode="before")
    @classmethod
    def parse_features(cls, v):
        if isinstance(v, str):
            import json

            try:
                return json.loads(v)
            except:
                pass
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image: Optional[str] = None
    specs: Optional[Dict[str, str]] = None
    skv: Optional[str] = None
    mrp: Optional[float] = None
    sale_price: Optional[float] = None
    features: Optional[List[str]] = None
    stock: Optional[int] = None


class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True


class OrderItem(BaseModel):
    product_id: int
    quantity: int
    price_at_purchase: Optional[float] = None
    product: Optional[Product] = None

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItem]
    total_amount: float
    customer_email: str
    status: str = "pending"
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class Order(OrderCreate):
    id: int
    txnid: Optional[str] = None
    created_at: Optional[datetime] = None
    coupon_code: Optional[str] = None
    discount_amount: Optional[float] = 0.0

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class UserBase(BaseModel):
    email: str
    full_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    profile_picture: Optional[str] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user_name: str
    role: str


class TokenData(BaseModel):
    email: str | None = None

    email: str | None = None


class ReviewDB(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    user_email = Column(String)
    user_name = Column(String)
    rating = Column(Integer)
    comment = Column(String)
    created_at = Column(String)  # Store as ISO string for simplicity


class ReviewCreate(BaseModel):
    rating: int
    comment: str

    @field_validator("comment", mode="before")
    @classmethod
    def sanitize_comment(cls, v):
        return sanitize_html(v)


class ReviewResponse(BaseModel):
    id: int
    rating: int
    comment: str
    user_name: str
    user_email: str
    created_at: str

    class Config:
        from_attributes = True


class ContactMessageDB(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RefreshTokenDB(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("UserDB", back_populates="refresh_tokens")


class WishlistItemDB(Base):
    __tablename__ = "wishlist_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    user = relationship("UserDB", back_populates="wishlist_items")
    product = relationship("ProductDB")


class CartItemDB(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    bundle_id = Column(Integer, ForeignKey("bundles.id"), nullable=True)
    quantity = Column(Integer, default=1)
    selected = Column(Boolean, default=True)

    user = relationship("UserDB", back_populates="cart_items")
    product = relationship("ProductDB")
    bundle = relationship("BundleDB")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CouponDB(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    discount_type = Column(String)  # 'percentage' or 'fixed'
    discount_value = Column(Float)
    min_purchase = Column(Float, default=0.0)
    expiry_date = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)


class BundleDB(Base):
    __tablename__ = "bundles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    original_price = Column(Float)
    bundle_price = Column(Float)
    is_active = Column(Boolean, default=True)

    products = relationship(
        "BundleProductDB", back_populates="bundle", cascade="all, delete-orphan"
    )


class BundleProductDB(Base):
    __tablename__ = "bundle_products"

    id = Column(Integer, primary_key=True, index=True)
    bundle_id = Column(Integer, ForeignKey("bundles.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    bundle = relationship("BundleDB", back_populates="products")
    product = relationship("ProductDB")


# Pydantic Schemas for Wishlist & Cart
class WishlistCreate(BaseModel):
    product_id: int


class WishlistResponse(BaseModel):
    id: int
    product_id: int
    product: Optional[Product] = None

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1
    selected: bool = True


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = None
    selected: Optional[bool] = None


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    bundle_id: Optional[int] = None
    quantity: int
    selected: bool
    product: Optional[Product] = None
    bundle: Optional[BundleResponse] = None

    class Config:
        from_attributes = True


class CartMergeRequest(BaseModel):
    items: List[CartItemCreate]


# Pydantic Schemas for Bundles
class BundleProductResponse(BaseModel):
    product_id: int
    product: Product

    class Config:
        from_attributes = True


class BundleResponse(BaseModel):
    id: int
    name: str
    description: str
    original_price: float
    bundle_price: float
    is_active: bool
    products: List[BundleProductResponse]

    class Config:
        from_attributes = True


class BundleCreate(BaseModel):
    name: str
    description: str
    original_price: float
    bundle_price: float
    product_ids: List[int]


class BundleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bundle_price: Optional[float] = None


# Pydantic Schemas for Coupons
class CouponBase(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_purchase: float = 0.0
    expiry_date: datetime
    is_active: bool = True
    usage_limit: Optional[int] = None


class CouponCreate(CouponBase):
    pass


class CouponResponse(CouponBase):
    id: int
    used_count: int

    class Config:
        from_attributes = True


class CouponUpdate(BaseModel):
    is_active: Optional[bool] = None
    discount_value: Optional[float] = None
    min_purchase: Optional[float] = None
    usage_limit: Optional[int] = None
    expiry_date: Optional[datetime] = None
