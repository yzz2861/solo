from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VehicleRecord(Base):
    __tablename__ = "vehicle_records"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(20), index=True, nullable=False, comment="车牌号")
    driver_name = Column(String(50), comment="司机姓名")
    driver_phone = Column(String(20), comment="司机电话")
    vehicle_type = Column(String(30), default="渣土车", comment="车辆类型")
    construction_site = Column(String(100), comment="所属工地")

    entry_time = Column(DateTime, server_default=func.now(), comment="进场时间")
    load_complete_time = Column(DateTime, comment="装载完成时间")
    wash_start_time = Column(DateTime, comment="洗轮开始时间")
    wash_complete_time = Column(DateTime, comment="洗轮完成时间")
    inspection_time = Column(DateTime, comment="检查时间")
    exit_time = Column(DateTime, comment="出场时间")

    status = Column(String(20), default="entered", comment="状态: entered/loaded/washing/washed/inspected/blocked/exited")
    queue_position = Column(Integer, comment="排队位置")

    load_cargo = Column(String(100), comment="装载货物")
    load_weight = Column(Float, comment="装载重量(吨)")

    is_rewashed = Column(Boolean, default=False, comment="是否返洗")
    rewash_count = Column(Integer, default=0, comment="返洗次数")
    block_count = Column(Integer, default=0, comment="被拦截次数")
    last_block_reason = Column(Text, comment="最后一次拦截原因")

    gate_operator = Column(String(50), comment="门岗操作员")
    safety_officer = Column(String(50), comment="安全员")
    inspector = Column(String(50), comment="检查员")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    wash_records = relationship("WashRecord", back_populates="vehicle_record", cascade="all, delete-orphan")
    inspection_records = relationship("InspectionRecord", back_populates="vehicle_record", cascade="all, delete-orphan")
    block_records = relationship("BlockRecord", back_populates="vehicle_record", cascade="all, delete-orphan")
    photos = relationship("VehiclePhoto", back_populates="vehicle_record", cascade="all, delete-orphan")


class WashRecord(Base):
    __tablename__ = "wash_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_record_id = Column(Integer, ForeignKey("vehicle_records.id"), nullable=False)
    wash_station = Column(String(50), comment="洗轮工位")
    operator = Column(String(50), comment="洗轮操作员")
    start_time = Column(DateTime, server_default=func.now(), comment="开始时间")
    end_time = Column(DateTime, comment="结束时间")
    duration_seconds = Column(Integer, comment="洗轮时长(秒)")
    water_pressure = Column(Float, comment="水压(bar)")
    is_rewash = Column(Boolean, default=False, comment="是否返洗")
    rewash_reason = Column(Text, comment="返洗原因")
    quality_score = Column(Integer, comment="洗轮质量评分 1-100")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, server_default=func.now())

    vehicle_record = relationship("VehicleRecord", back_populates="wash_records")


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_record_id = Column(Integer, ForeignKey("vehicle_records.id"), nullable=False)
    inspector = Column(String(50), comment="检查员")
    inspection_time = Column(DateTime, server_default=func.now(), comment="检查时间")

    tarp_cover_ok = Column(Boolean, default=False, comment="篷布覆盖是否合格")
    tarp_photo_taken = Column(Boolean, default=False, comment="是否拍摄篷布照片")
    wheel_clean_ok = Column(Boolean, default=False, comment="车轮清洁是否合格")
    body_clean_ok = Column(Boolean, default=False, comment="车身清洁是否合格")
    license_plate_clear = Column(Boolean, default=False, comment="车牌是否清晰可见")
    overloaded = Column(Boolean, default=False, comment="是否超载")

    passed = Column(Boolean, default=False, comment="是否通过检查")
    failure_reason = Column(Text, comment="不通过原因")
    need_rewash = Column(Boolean, default=False, comment="是否需要返洗")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, server_default=func.now())

    vehicle_record = relationship("VehicleRecord", back_populates="inspection_records")


class BlockRecord(Base):
    __tablename__ = "block_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_record_id = Column(Integer, ForeignKey("vehicle_records.id"), nullable=False)
    plate_number = Column(String(20), index=True, comment="车牌号")
    block_time = Column(DateTime, server_default=func.now(), comment="拦截时间")
    block_type = Column(String(30), comment="拦截类型: no_wash/no_tarp_photo/inspection_failed/environmental")
    block_reason = Column(Text, comment="拦截原因详细说明")
    block_operator = Column(String(50), comment="拦截操作员")
    resolved = Column(Boolean, default=False, comment="是否已解决")
    resolve_time = Column(DateTime, comment="解决时间")
    resolve_method = Column(String(100), comment="解决方式")
    resolve_operator = Column(String(50), comment="解决操作员")
    is_environmental_issue = Column(Boolean, default=False, comment="是否环保异常")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, server_default=func.now())

    vehicle_record = relationship("VehicleRecord", back_populates="block_records")


class VehiclePhoto(Base):
    __tablename__ = "vehicle_photos"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_record_id = Column(Integer, ForeignKey("vehicle_records.id"), nullable=False)
    photo_type = Column(String(30), comment="照片类型: entry/wheel_before/wheel_after/tarp/body/plate/exit")
    file_path = Column(String(255), comment="文件存储路径")
    file_name = Column(String(255), comment="原始文件名")
    file_size = Column(Integer, comment="文件大小(字节)")
    uploaded_by = Column(String(50), comment="上传人")
    upload_time = Column(DateTime, server_default=func.now(), comment="上传时间")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, server_default=func.now())

    vehicle_record = relationship("VehicleRecord", back_populates="photos")
