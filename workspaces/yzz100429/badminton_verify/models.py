from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    source_type = Column(String(32), nullable=False)
    imported_at = Column(DateTime, default=datetime.now)
    row_count = Column(Integer, default=0)
    status = Column(String(32), default="success")

    registrations = relationship("Registration", back_populates="import_record")
    payments = relationship("Payment", back_populates="import_record")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False, index=True)
    normalized_name = Column(String(64), nullable=False, index=True)
    phone = Column(String(32), index=True)
    normalized_phone = Column(String(32), index=True)
    id_card_last4 = Column(String(8), index=True)
    gender = Column(String(8))
    birth_year = Column(Integer)
    club = Column(String(128), index=True)
    wechat_id = Column(String(64))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    merge_master_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    registrations = relationship("Registration", back_populates="player",
                                 foreign_keys="Registration.player_id")
    partner_registrations = relationship("Registration", back_populates="partner",
                                          foreign_keys="Registration.partner_id")
    payments = relationship("Payment", back_populates="player")
    anomalies = relationship("Anomaly", back_populates="player")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    event = Column(String(64), nullable=False, index=True)
    age_group = Column(String(32), index=True)
    partner_name = Column(String(64))
    partner_phone = Column(String(32))
    partner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    club_representative = Column(String(64))
    raw_data = Column(Text)
    registered_at = Column(DateTime, default=datetime.now)
    is_valid = Column(Boolean, default=True)
    confirmed = Column(Boolean, default=False)

    player = relationship("Player", back_populates="registrations", foreign_keys=[player_id])
    partner = relationship("Player", foreign_keys=[partner_id])
    import_record = relationship("ImportRecord", back_populates="registrations")
    group_assignment = relationship("GroupAssignment", back_populates="registration", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), index=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), nullable=False)
    payer_name = Column(String(64))
    normalized_payer_name = Column(String(64), index=True)
    phone = Column(String(32))
    amount = Column(Float, nullable=False)
    expected_amount = Column(Float)
    payment_method = Column(String(32))
    screenshot_ref = Column(String(255))
    paid_at = Column(DateTime)
    remark = Column(String(255))
    is_verified = Column(Boolean, default=False)
    raw_data = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    player = relationship("Player", back_populates="payments")
    import_record = relationship("ImportRecord", back_populates="payments")


class GroupRule(Base):
    __tablename__ = "group_rules"

    id = Column(Integer, primary_key=True, index=True)
    event = Column(String(64), nullable=False, index=True)
    age_group = Column(String(32), nullable=False, index=True)
    min_age = Column(Integer)
    max_age = Column(Integer)
    fee = Column(Float, nullable=False)
    gender_rule = Column(String(32))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (UniqueConstraint("event", "age_group", name="uq_event_agegroup"),)


class GroupAssignment(Base):
    __tablename__ = "group_assignments"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), nullable=False, unique=True)
    rule_id = Column(Integer, ForeignKey("group_rules.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.now)

    registration = relationship("Registration", back_populates="group_assignment")
    rule = relationship("GroupRule")


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), index=True)
    anomaly_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), default="warning")
    description = Column(String(1024), nullable=False)
    field_name = Column(String(64))
    field_value = Column(String(255))
    expected_value = Column(String(255))
    resolved = Column(Boolean, default=False)
    resolved_note = Column(String(512))
    created_at = Column(DateTime, default=datetime.now)

    player = relationship("Player", back_populates="anomalies")
