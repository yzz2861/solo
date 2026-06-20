from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProductModelBase(BaseModel):
    name: str
    is_old: bool = False
    description: str = ""


class ProductModelCreate(ProductModelBase):
    pass


class ProductModelResponse(ProductModelBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ManualSectionBase(BaseModel):
    page_number: int = 1
    section_title: str = ""
    content: str
    keywords: str = ""


class ManualSectionCreate(ManualSectionBase):
    pass


class ManualSectionResponse(ManualSectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ManualBase(BaseModel):
    title: str
    content: str
    source_type: str = "manual"


class ManualCreate(ManualBase):
    product_model_id: int
    sections: List[ManualSectionCreate] = []


class ManualResponse(ManualBase):
    id: int
    product_model_id: int
    created_at: datetime
    sections: List[ManualSectionResponse] = []

    class Config:
        from_attributes = True


class FAQBase(BaseModel):
    question: str
    answer: str
    source_page: str = "FAQ"
    notes: str = ""
    category: str = "general"
    is_warranty_exception: bool = False
    is_model_difference: bool = False


class FAQCreate(FAQBase):
    product_model_id: int


class FAQResponse(FAQBase):
    id: int
    product_model_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QueryRequest(BaseModel):
    question: str
    product_model_id: Optional[int] = None
    product_model_name: Optional[str] = None
    agent_id: str = "default"


class QueryResponse(BaseModel):
    query_id: int
    answer_type: str
    answer: str
    source: str
    notes: str
    matched_question: Optional[str] = None
    need_followup: List[str] = []
    is_no_answer: bool = False
    is_missing_model: bool = False
    is_old_model: bool = False


class AgentDecisionBase(BaseModel):
    adopted: bool = True
    modified_answer: str = ""
    modify_reason: str = ""


class AgentDecisionCreate(AgentDecisionBase):
    query_record_id: int


class AgentDecisionResponse(AgentDecisionBase):
    id: int
    supervisor_reviewed: bool = False
    supervisor_note: str = ""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QueryRecordResponse(BaseModel):
    id: int
    product_model_id: Optional[int] = None
    question: str
    answer_type: str
    matched_question: str
    matched_answer: str
    matched_source: str
    notes: str
    is_no_answer: bool
    is_old_model: bool
    is_missing_model: bool
    is_warranty_question: bool
    is_model_diff_question: bool
    agent_id: str
    created_at: datetime
    decision: Optional[AgentDecisionResponse] = None

    class Config:
        from_attributes = True


class NoAnswerStats(BaseModel):
    question: str
    count: int
    is_old_model: bool
    sample_query_ids: List[int]


class StatsResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    total_queries: int
    answered_count: int
    no_answer_count: int
    adoption_rate: float
    modification_count: int
    missing_model_count: int
    old_model_count: int
    warranty_question_count: int
    model_diff_count: int
    top_no_answer: List[NoAnswerStats]
    uncovered_categories: List[str]
    old_model_problems: List[NoAnswerStats]


class BatchImportFAQ(BaseModel):
    items: List[FAQCreate]


class BatchImportManual(BaseModel):
    product_model_id: int
    title: str
    content: str
    sections: List[ManualSectionCreate] = []
