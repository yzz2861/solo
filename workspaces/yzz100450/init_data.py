from datetime import date, timedelta, datetime
from database import SessionLocal, Base, engine
import models, crud, schemas
from models import BloodType, BloodComponent

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    print("开始初始化测试数据...")

    today = date.today()

    test_bags = [
        schemas.BloodBagCreate(
            bag_code="A-PLT-001",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today - timedelta(days=2),
            expiration_date=today + timedelta(days=1),
            storage_location="A区-血小板冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="A-PLT-002",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today - timedelta(days=1),
            expiration_date=today + timedelta(days=2),
            storage_location="A区-血小板冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="A-PLT-003",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today,
            expiration_date=today + timedelta(days=3),
            storage_location="A区-血小板冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="A-PLT-004",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today,
            expiration_date=today + timedelta(days=5),
            storage_location="A区-血小板冷藏柜-2号"
        ),
        schemas.BloodBagCreate(
            bag_code="A-RBC-001",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.RED_CELLS,
            volume_ml=400,
            donation_date=today - timedelta(days=10),
            expiration_date=today + timedelta(days=25),
            storage_location="A区-红细胞冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="A-RBC-002",
            blood_type=BloodType.A_POSITIVE,
            component=BloodComponent.RED_CELLS,
            volume_ml=400,
            donation_date=today - timedelta(days=5),
            expiration_date=today + timedelta(days=30),
            storage_location="A区-红细胞冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="B-PLT-001",
            blood_type=BloodType.B_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today - timedelta(days=1),
            expiration_date=today + timedelta(days=2),
            storage_location="B区-血小板冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="B-PLT-002",
            blood_type=BloodType.B_POSITIVE,
            component=BloodComponent.PLATELETS,
            volume_ml=200,
            donation_date=today,
            expiration_date=today + timedelta(days=3),
            storage_location="B区-血小板冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="O-RBC-001",
            blood_type=BloodType.O_POSITIVE,
            component=BloodComponent.RED_CELLS,
            volume_ml=400,
            donation_date=today - timedelta(days=15),
            expiration_date=today + timedelta(days=20),
            storage_location="O区-红细胞冷藏柜-1号"
        ),
        schemas.BloodBagCreate(
            bag_code="AB-PLA-001",
            blood_type=BloodType.AB_POSITIVE,
            component=BloodComponent.PLASMA,
            volume_ml=200,
            donation_date=today - timedelta(days=30),
            expiration_date=today + timedelta(days=335),
            storage_location="AB区-血浆冷冻柜-1号"
        ),
    ]

    for bag in test_bags:
        existing = crud.get_blood_bag_by_code(db, bag.bag_code)
        if not existing:
            crud.create_blood_bag(db, bag)
            print(f"  新增血袋: {bag.bag_code}")
        else:
            print(f"  已存在，跳过: {bag.bag_code}")

    print(f"\n初始化完成，共 {len(test_bags)} 袋测试数据")
    print(f"A型血小板可用: {crud.count_available_bags(db, BloodType.A_POSITIVE, BloodComponent.PLATELETS)} 袋")
    print(f"B型血小板可用: {crud.count_available_bags(db, BloodType.B_POSITIVE, BloodComponent.PLATELETS)} 袋")
    print(f"A型红细胞可用: {crud.count_available_bags(db, BloodType.A_POSITIVE, BloodComponent.RED_CELLS)} 袋")

finally:
    db.close()
