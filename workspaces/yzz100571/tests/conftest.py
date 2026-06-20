import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.database import Base, get_db
from app.main import app
from app.auth import get_password_hash
from app.models import (
    User,
    UserRole,
    Cabinet,
    PDU,
    PDUPort,
    Switch,
    SwitchPort,
    DeviceModel,
)

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session, test_users, test_cabinet, test_pdu, test_switch, test_device_model, test_device_model_4u):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_users(db_session):
    users = []
    roles = [
        ("admin", "系统管理员", UserRole.ADMIN),
        ("operation", "运维工程师", UserRole.OPERATION),
        ("duty", "机房值班", UserRole.DUTY),
        ("auditor", "审计员", UserRole.AUDITOR),
    ]
    for username, full_name, role in roles:
        user = User(
            username=username,
            full_name=full_name,
            email=f"{username}@company.com",
            hashed_password=get_password_hash("test123"),
            role=role,
            is_active=True
        )
        db_session.add(user)
        users.append(user)
    db_session.commit()
    return users


@pytest.fixture(scope="function")
def test_cabinet(db_session):
    cabinet = Cabinet(
        name="A01",
        location="机房1-A区",
        total_u=42,
        max_power_watts=5000,
        description="测试机柜"
    )
    db_session.add(cabinet)
    db_session.commit()
    db_session.refresh(cabinet)
    return cabinet


@pytest.fixture(scope="function")
def test_pdu(db_session, test_cabinet):
    pdu = PDU(
        cabinet_id=test_cabinet.id,
        name="PDU-A",
        total_ports=8,
        max_current_amps=16,
        voltage=220
    )
    db_session.add(pdu)
    db_session.commit()
    db_session.refresh(pdu)
    pdu_id = pdu.id

    for port_num in range(1, 9):
        port = PDUPort(pdu_id=pdu.id, port_number=port_num)
        db_session.add(port)
    db_session.commit()

    return db_session.query(PDU).filter(PDU.id == pdu_id).first()


@pytest.fixture(scope="function")
def test_switch(db_session, test_cabinet):
    switch = Switch(
        cabinet_id=test_cabinet.id,
        name="SW-A",
        model="Cisco Catalyst 9300",
        total_ports=48
    )
    db_session.add(switch)
    db_session.commit()
    db_session.refresh(switch)
    switch_id = switch.id

    for port_num in range(1, 49):
        port = SwitchPort(switch_id=switch.id, port_number=port_num)
        db_session.add(port)
    db_session.commit()

    return db_session.query(Switch).filter(Switch.id == switch_id).first()


@pytest.fixture(scope="function")
def test_device_model(db_session):
    device = DeviceModel(
        brand="Dell",
        model="PowerEdge R750",
        height_u=2,
        power_watts=750,
        network_ports=2,
        power_ports=2,
        description="2U机架式服务器"
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)
    return device


@pytest.fixture(scope="function")
def test_device_model_4u(db_session):
    device = DeviceModel(
        brand="HP",
        model="ProLiant DL580",
        height_u=4,
        power_watts=1500,
        network_ports=4,
        power_ports=2,
        description="4U高端服务器"
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)
    return device


def get_auth_headers(client, username):
    response = client.post(
        "/api/auth/login",
        data={"username": username, "password": "test123"}
    )
    if response.status_code != 200:
        raise Exception(f"Login failed for {username}: {response.status_code} - {response.text}")
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
