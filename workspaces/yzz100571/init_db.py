from app.database import engine, Base
from app.models import User, UserRole
from app.auth import get_password_hash

Base.metadata.create_all(bind=engine)

print("数据库表创建完成！")
