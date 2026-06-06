"""规则层异常定义"""


class RuleViolationError(Exception):
    """规则违反异常"""
    def __init__(self, rule_id: str, rule_name: str, message: str):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.message = message
        super().__init__(f"规则[{rule_name}]违反: {message}")


class RuleConflictError(Exception):
    """规则冲突异常"""
    def __init__(self, rule_ids: list, message: str):
        self.rule_ids = rule_ids
        self.message = message
        super().__init__(f"规则冲突: {message}")


class DuplicateProcessError(Exception):
    """重复处理异常"""
    def __init__(self, batch_no: str, current_status: str):
        self.batch_no = batch_no
        self.current_status = current_status
        super().__init__(
            f"批次[{batch_no}]当前状态[{current_status}]不允许重复处理"
        )
