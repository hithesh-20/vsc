from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole, LanguagePreference
from app.models.vendor import Vendor
from app.models.customer import Customer, LoyaltyTier
from app.models.product import Category, Product, ProductUnit
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.models.sale import Sale, SaleItem, PaymentMode
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus


def seed_database():
    """Create tables and populate rich demonstration data for VendorSaathi."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding VendorSaathi database with realistic Indian vendor data...")

        # 1. Categories
        cat_veg = Category(name="Vegetables", name_kn="ತರಕಾರಿಗಳು", icon_name="carrot", description="Fresh farm vegetables")
        cat_fruits = Category(name="Fruits", name_kn="ಹಣ್ಣುಗಳು", icon_name="apple", description="Seasonal fresh fruits")
        cat_snacks = Category(name="Snacks & Fast Food", name_kn="ತಿಂಡಿ ಮತ್ತು ತಿಂಡಿಗಳು", icon_name="utensils", description="Hot street food & snacks")
        cat_beverages = Category(name="Tea & Beverages", name_kn="ಚಹಾ ಮತ್ತು ಪಾನೀಯಗಳು", icon_name="coffee", description="Tea, Coffee & Fresh Juices")
        cat_groceries = Category(name="Groceries", name_kn="ದಿನಸಿ ವಸ್ತುಗಳು", icon_name="shopping-bag", description="Daily essentials")
        db.add_all([cat_veg, cat_fruits, cat_snacks, cat_beverages, cat_groceries])
        db.flush()

        # 2. Vendors & Users
        # Vendor 1: Ramesh Vegetable Cart (Primary Demo Account: 9876543210 / 1234)
        u1 = User(
            phone="9876543210",
            hashed_password=get_password_hash("1234"),
            role=UserRole.VENDOR,
            language_pref=LanguagePreference.KN
        )
        db.add(u1)
        db.flush()

        v1 = Vendor(
            user_id=u1.id,
            business_name="Ramesh Fresh Vegetables",
            business_name_kn="ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು",
            business_category="Vegetables",
            operating_location="Gandhi Circle & Main Bazaar",
            current_lat=12.9716,
            current_lon=77.5946,
            operating_radius_km=8.0,
            rating_avg=4.9,
            rating_count=34.0,
            working_hours="06:30 AM - 07:30 PM",
            upi_id="ramesh.veg@okhdfcbank"
        )
        db.add(v1)
        db.flush()

        # Vendor 2: Manjunath Fruit Stall (Competitor/Peer Account: 9876543211 / 1234)
        u2 = User(
            phone="9876543211",
            hashed_password=get_password_hash("1234"),
            role=UserRole.VENDOR,
            language_pref=LanguagePreference.KN
        )
        db.add(u2)
        db.flush()

        v2 = Vendor(
            user_id=u2.id,
            business_name="Manjunath Seasonal Fruits",
            business_name_kn="ಮಂಜುನಾಥ್ ಹಣ್ಣಿನ ಅಂಗಡಿ",
            business_category="Fruits",
            operating_location="Bus Stand Road",
            current_lat=12.9780,
            current_lon=77.5850,
            operating_radius_km=10.0,
            rating_avg=4.7,
            rating_count=21.0,
            upi_id="manjunath.fruits@okaxis"
        )
        db.add(v2)

        # 3. Customer Account (Primary Demo Customer: 9876543220 / 1234)
        u_cust = User(
            phone="9876543220",
            hashed_password=get_password_hash("1234"),
            role=UserRole.CUSTOMER,
            language_pref=LanguagePreference.EN
        )
        db.add(u_cust)
        db.flush()

        c1 = Customer(
            user_id=u_cust.id,
            full_name="Priya Sharma",
            delivery_address="#42, 3rd Cross, Gandhi Nagar, Bengaluru",
            default_lat=12.9725,
            default_lon=77.5960,
            loyalty_points=340,
            tier=LoyaltyTier.SILVER
        )
        db.add(c1)
        db.flush()

        # 4. Products for Vendor 1 (Ramesh Vegetables)
        products_v1_data = [
            ("Tomato (Local Farm)", "ಟೊಮೇಟೊ", cat_veg.id, ProductUnit.KG, 18.0, 30.0, 24.0, 5.0, "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400"),
            ("Red Onion", "ಈರುಳ್ಳಿ", cat_veg.id, ProductUnit.KG, 25.0, 40.0, 35.0, 10.0, "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400"),
            ("Potato", "ಆಲೂಗಡ್ಡೆ", cat_veg.id, ProductUnit.KG, 22.0, 35.0, 40.0, 8.0, "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400"),
            ("Fresh Green Chilli", "ಹಸಿ ಮೆಣಸಿನಕಾಯಿ", cat_veg.id, ProductUnit.KG, 40.0, 70.0, 6.0, 2.0, "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400"),
            ("Coriander Bunch", "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", cat_veg.id, ProductUnit.BUNCH, 8.0, 15.0, 18.0, 5.0, "https://images.unsplash.com/photo-1506484381205-f7945653044d?w=400"),
            ("Carrot", "ಕ್ಯಾರೆಟ್", cat_veg.id, ProductUnit.KG, 30.0, 50.0, 12.0, 4.0, "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400"),
            ("Cucumber", "ಸೌತೆಕಾಯಿ", cat_veg.id, ProductUnit.KG, 20.0, 35.0, 15.0, 3.0, "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400"),
            ("Ladies Finger (Bhindi)", "ಬೆಂಡೆಕಾಯಿ", cat_veg.id, ProductUnit.KG, 28.0, 45.0, 3.5, 5.0, "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400"),  # Low stock trigger
        ]

        created_products = []
        for name_en, name_kn, cid, unit, cost, sell, stock, low_th, img in products_v1_data:
            p = Product(
                vendor_id=v1.id,
                category_id=cid,
                name_en=name_en,
                name_kn=name_kn,
                unit=unit,
                cost_price=cost,
                selling_price=sell,
                current_stock=stock,
                low_stock_threshold=low_th,
                image_url=img,
                is_available=True,
                is_perishable=True
            )
            db.add(p)
            db.flush()
            created_products.append(p)

            # Initial stock ledger
            db.add(InventoryLedger(
                product_id=p.id,
                change_qty=stock,
                transaction_type=InventoryTransactionType.INITIAL,
                balance_after=stock,
                notes="Initial inventory setup"
            ))

        # 5. Historical Sales Records (Past 5 Days for rich profit charts)
        now = datetime.now(timezone.utc)
        for days_back in range(5, 0, -1):
            sale_time = now - timedelta(days=days_back, hours=2)
            # Create 3-4 sales per day
            for s_idx in range(1, 4):
                p1 = created_products[0]  # Tomato
                p2 = created_products[1]  # Onion

                qty1, qty2 = 2.5 + s_idx, 2.0 + s_idx
                sub1 = qty1 * p1.selling_price
                cogs1 = qty1 * p1.cost_price
                sub2 = qty2 * p2.selling_price
                cogs2 = qty2 * p2.cost_price

                tot_rev = sub1 + sub2
                tot_cogs = cogs1 + cogs2
                tot_profit = tot_rev - tot_cogs

                sale = Sale(
                    vendor_id=v1.id,
                    customer_name=f"Customer #{s_idx}",
                    total_amount=tot_rev,
                    total_cost=tot_cogs,
                    discount_amount=0.0,
                    net_amount=tot_rev,
                    net_profit=tot_profit,
                    payment_mode=PaymentMode.UPI if s_idx % 2 == 0 else PaymentMode.CASH,
                    cash_paid=tot_rev if s_idx % 2 != 0 else 0.0,
                    upi_paid=tot_rev if s_idx % 2 == 0 else 0.0,
                    is_synced=True,
                    created_at=sale_time
                )
                db.add(sale)
                db.flush()

                db.add(SaleItem(
                    sale_id=sale.id,
                    product_id=p1.id,
                    product_name_snapshot=p1.name_en,
                    quantity=qty1,
                    unit=p1.unit.value,
                    unit_cost_price=p1.cost_price,
                    unit_selling_price=p1.selling_price,
                    subtotal=sub1,
                    profit=sub1 - cogs1
                ))
                db.add(SaleItem(
                    sale_id=sale.id,
                    product_id=p2.id,
                    product_name_snapshot=p2.name_en,
                    quantity=qty2,
                    unit=p2.unit.value,
                    unit_cost_price=p2.cost_price,
                    unit_selling_price=p2.selling_price,
                    subtotal=sub2,
                    profit=sub2 - cogs2
                ))

        # 6. Udhaar Credit Records
        udhaar_samples = [
            ("Kumar (Tea Shop)", "9845011223", 450.0, 150.0, 300.0, UdhaarStatus.PARTIAL, "Weekly vegetable supply for tea stall"),
            ("Sunil Auto Driver", "9845044556", 220.0, 0.0, 220.0, UdhaarStatus.UNPAID, "Daily home groceries"),
            ("Govindraj (Tailor)", "9845077889", 680.0, 300.0, 380.0, UdhaarStatus.PARTIAL, "Monthly credit arrangement"),
            ("Lakshmamma", "9845099001", 140.0, 140.0, 0.0, UdhaarStatus.SETTLED, "Cleared on Monday via UPI"),
        ]

        for c_name, c_phone, due, paid, rem, st, notes in udhaar_samples:
            db.add(UdhaarLedger(
                vendor_id=v1.id,
                customer_name=c_name,
                customer_phone=c_phone,
                amount_due=due,
                amount_paid=paid,
                remaining_balance=rem,
                status=st,
                notes=notes,
                due_date=datetime.now(timezone.utc) + timedelta(days=3)
            ))

        # 7. Customer Sample Order
        ord1 = Order(
            order_number="ORD-0822-A101",
            customer_id=c1.id,
            vendor_id=v1.id,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            payment_mode="UPI",
            total_amount=170.0,
            delivery_address=c1.delivery_address,
            delivery_lat=12.9725,
            delivery_lon=77.5960,
            special_instructions="Please select fresh ripe tomatoes"
        )
        db.add(ord1)
        db.flush()

        db.add(OrderItem(
            order_id=ord1.id,
            product_id=created_products[0].id,  # Tomato
            product_name_snapshot="Tomato (Local Farm)",
            quantity=3.0,
            unit="kg",
            unit_price=30.0,
            subtotal=90.0
        ))
        db.add(OrderItem(
            order_id=ord1.id,
            product_id=created_products[1].id,  # Onion
            product_name_snapshot="Red Onion",
            quantity=2.0,
            unit="kg",
            unit_price=40.0,
            subtotal=80.0
        ))

        db.commit()
        print("VendorSaathi seed database successfully populated!")

    except Exception as e:
        db.rollback()
        print(f"Database seeding error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
