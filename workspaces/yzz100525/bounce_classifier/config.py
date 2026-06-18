"""分类规则与退信原因映射。

分类优先级：硬退 > 黑名单 > 需要人工联系 > 软退
同一收件人多次退回时，按最高优先级归类并合并说明。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Pattern, Tuple
import re

from .models import BounceCategory


@dataclass
class Rule:
    pattern: Pattern
    category: BounceCategory
    label: str
    needs_manual: bool = False
    is_forward: bool = False


HARD_BOUNCE_PATTERNS: List[Tuple[str, str]] = [
    (r"5\.(1\.[01]|2\.[01]|4\.1|4\.4|5\.0)", "收件人地址不存在"),
    (r"mailbox\s+(not\s+found|does\s+not\s+exist|unavailable)", "邮箱不存在"),
    (r"(no\s+such\s+(user|mailbox|account|recipient)|unknown\s+(user|recipient))", "无此收件人"),
    (r"account\s+(disabled|suspended|expired|terminated|inactive)", "账户已停用/过期"),
    (r"domain\s+(not\s+found|does\s+not\s+exist|is\s+invalid)", "域名不存在"),
    (r"(recipient\s+address\s+rejected|rejected\s+by\s+recipient)", "收件人地址被拒收"),
    (r"user\s+(unknown|invalid|not\s+found|doesn['\u2019]t\s+exist)", "用户无效或不存在"),
    (r"(invalid|bad|incorrect|malformed).{0,10}(address|recipient|email|rcpt)", "地址无效或错误"),
    (r"d?ns\s+(lookup\s+)?fail(ed|ure)", "域名解析失败"),
    (r"host\s+(not\s+found|unknown|unreachable)", "邮件服务器不可达"),
    (r"permanent\s+(error|failure)", "永久性错误"),
    (r"address\s+(not\s+listed|no\s+longer\s+valid)", "地址已失效"),
    (r"relay\s+(access\s+)?denied.{0,30}(not\s+allowed|reject)", "转发被拒（无此用户）"),
    (r"box\s+does\s+not\s+exist", "邮箱不存在"),
    (r"(does|did)\s+not\s+reach.{0,40}recipient", "投递失败（永久）"),
    (r"550[\s-]\d", "SMTP 550 永久拒绝"),
    (r"552[\s-]\d.*?(mailbox\s+full|quota\s+exceed|over\s+quota|storage)", "邮箱已满（硬退）"),
    (r"邮箱.{0,10}(不存在|无效|错误|未启用|已注销|被冻结|过期)", "邮箱不存在或无效"),
    (r"收件人.{0,10}(不存在|无效|错误|未找到|被拒收)", "收件人不存在或被拒收"),
    (r"(用户|账户|账号).{0,10}(不存在|无效|未启用|已注销|停用)", "用户不存在或已停用"),
    (r"域名.{0,10}(不存在|无效|无法解析|不存在MX)", "域名无效或无法解析"),
    (r"该邮箱(地址)?(已|被)?(关闭|停用|注销|删除|作废|冻结|撤销)", "邮箱已关闭/注销"),
    (r"地址.{0,10}(不正确|有误|格式错误|不存在|不合法)", "地址不正确"),
    (r"no_mailbox|mailbox_disabled|user_disabled|account_expired", "硬退标识"),
    (r"5\.1\.0|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.10|5\.2\.0|5\.2\.1|5\.4\.1|5\.4\.4", "SMTP 5.x 永久错误"),
    (r"550[\s\-](\d\.\d\.\d)?", "SMTP 550 错误"),
]

SOFT_BOUNCE_PATTERNS: List[Tuple[str, str]] = [
    (r"4\.[0-9]+\.[0-9]+", "临时性故障（SMTP 4xx）"),
    (r"(mailbox|inbox|quota|storage).{0,15}(full|exceed|over\s+limit|overflow)", "邮箱已满/超配额"),
    (r"(insufficient|not\s+enough|no)\s+(space|storage|room|quota)", "存储空间不足"),
    (r"temporar(ily|y)\s+(fail|error|unavailable|reject|defer|problem)", "临时故障/延迟"),
    (r"(connection\s+)?(time.?out|timed?\s*out)", "连接超时"),
    (r"(server|host|service).{0,10}(busy|overload|unavailable|down|maintenance)", "服务器忙/不可用"),
    (r"(greylisted|gray\s?listed|deferred|rate\s+limit|too\s+many|throttl)", "灰名单/速率限制"),
    (r"message\s+(size|too\s+large|exceeds\s+limit)", "邮件大小超限"),
    (r"content\s+(reject|filter|spam|virus|policy|blocked)", "内容被过滤/策略拒绝"),
    (r"delivery\s+delay(ed)?|delayed?\s+status", "投递延迟"),
    (r"try\s+again|later|retry|resend", "建议稍后重试"),
    (r"421[\s-]\d|450[\s-]\d|451[\s-]\d|452[\s-]\d", "SMTP 4xx 临时错误"),
    (r"邮箱(空间)?(不足|已满|超限|不够用|满了)", "邮箱已满或空间不足"),
    (r"服务器.{0,10}(忙|繁忙|维护|过载|重启|暂时不可用|临时)", "服务器繁忙或维护"),
    (r"(网络|连接).{0,10}(超时|中断|异常|波动|不稳定|失败)", "网络或连接异常"),
    (r"(临时|暂时).{0,15}(失败|不可用|故障|延迟|拒绝|限制)", "临时失败或延迟"),
    (r"邮件.{0,10}(过大|超.*?大|大小超限|容量超限)", "邮件大小超限"),
    (r"(队列|排队).{0,5}(中|延迟|过长)", "排队延迟"),
    (r"4\.\d\.\d", "SMTP 4.x 临时错误"),
]

BLACKLIST_PATTERNS: List[Tuple[str, str]] = [
    (r"(black\s?list|blacklisted|bl\.|dnsbl|rbl|uribl)", "命中黑名单"),
    (r"(ip|domain|sender|address).{0,10}(black.?listed|blocked|barracuda|spamhaus)", "IP/域名被列入黑名单"),
    (r"(listed\s+in|appears\s+on|found\s+on).{0,30}(blacklist|rbl|dnsbl|spam|block)", "被黑名单收录"),
    (r"(reputation|poor\s+reputation|low\s+score)", "发件信誉差"),
    (r"(suspicious|phishing|malware|fraud|scam|junk|unsolicited)", "被标记为可疑/钓鱼/垃圾"),
    (r"spf\s+(fail|softfail|permerror|none).{0,20}(reject|deny|block)", "SPF 校验失败且被拒"),
    (r"dkim\s+(fail|permerror).{0,20}(reject|deny|block)", "DKIM 校验失败且被拒"),
    (r"dmarc\s+(reject|quarantine)", "DMARC 拒绝"),
    (r"5\.7\.\d|550[\s-]\d.*?(blacklist|spam|policy|block)", "SMTP 5.7 策略拒绝"),
    (r"(被|进入|列入|加入).{0,5}(黑名单|黑名單)", "被列入黑名单"),
    (r"(垃圾|钓鱼|诈骗|恶意).{0,10}(邮件|内容|行为)", "内容被识别为垃圾/钓鱼"),
    (r"(信誉|口碑).{0,10}(差|低|不好|不良)", "发件信誉不良"),
    (r"反向.{0,5}(解析|DNS).{0,5}(失败|不匹配)", "反向DNS失败"),
    (r"(spamhaus|surbl|uribl|spamcop|barracuda)", "知名黑名单库"),
]

MANUAL_PATTERNS: List[Tuple[str, str]] = [
    (r"auto\s*reply|auto.?respond|vacation|out\s+of\s+office|不在办公室|自动回复", "自动回复/不在办公室"),
    (r"(challenge|challenge-response|verify|confirm|captcha).{0,20}(email|address|you)", "需验证挑战信"),
    (r"(opt\s*out|unsubscribe|preference|remove\s+me|取消订阅|退订)", "含有退订/偏好设置"),
    (r"forward.{0,20}(fail|error|bounce|denied|unable|problem)|转发.{0,10}(失败|异常|错误)", "转发地址失败"),
    (r"(loop|mail\s+loop|circular|循环).{0,10}(detected|邮件|转发)", "检测到邮件循环"),
    (r"(customer|contact|service|support).{0,15}(service|center|team|客服)", "客服/支持类地址"),
    (r"(change\s+of|new\s+).{0,10}(address|email|contact)|更换.{0,10}邮箱", "提示更换邮箱"),
    (r"(please\s+)?(reply|respond|confirm|call|contact).{0,25}(to\s+continue|verify|activate)", "需人工确认/验证"),
    (r"administrative\s+action|administrative\s+prohibition", "管理性禁发"),
    (r"(human|person|manual).{0,10}(review|check|required|needed)", "需人工审核"),
    (r"(undeliverable|unable\s+to\s+deliver).{0,40}(reason|unknown|undetermined|unspecified)", "原因不明需人工判断"),
    (r"554[\s-]\d|5\.0\.\d|5\.5\.\d", "未明确分类的SMTP错误"),
    (r"无法(确认|判断|识别|归类).{0,10}原因", "原因不明"),
    (r"(未知|未分类|未标明).{0,10}错误", "未知错误"),
]

FORWARD_FAILURE_HINTS = [
    "forward",
    "转发",
    "forwarding",
    "forward address",
    "forwarding address",
    "alias",
    "别名",
]


def _compile_rules(
    patterns: List[Tuple[str, str]], category: BounceCategory, needs_manual: bool = False
) -> List[Rule]:
    rules: List[Rule] = []
    for regex, label in patterns:
        rules.append(
            Rule(
                pattern=re.compile(regex, re.IGNORECASE | re.MULTILINE),
                category=category,
                label=label,
                needs_manual=needs_manual,
            )
        )
    return rules


HARD_RULES = _compile_rules(HARD_BOUNCE_PATTERNS, BounceCategory.HARD)
SOFT_RULES = _compile_rules(SOFT_BOUNCE_PATTERNS, BounceCategory.SOFT)
BLACKLIST_RULES = _compile_rules(BLACKLIST_PATTERNS, BounceCategory.BLACKLIST)
MANUAL_RULES = _compile_rules(MANUAL_PATTERNS, BounceCategory.MANUAL, needs_manual=True)

ALL_RULES = BLACKLIST_RULES + HARD_RULES + MANUAL_RULES + SOFT_RULES


REASON_CODE_MAP: Dict[str, str] = {
    "5.1.0": "收件人地址无效/被拒",
    "5.1.1": "收件人不存在",
    "5.1.2": "收件人域名不存在",
    "5.1.3": "收件人地址语法错误",
    "5.1.6": "收件人邮箱已停用/迁移",
    "5.1.10": "收件人不存在（收件方服务器无法路由）",
    "5.2.0": "邮箱状态未知",
    "5.2.1": "邮箱已禁用",
    "5.2.2": "邮箱已满（配额超限）",
    "5.2.3": "邮件大小超过收件人限额",
    "5.3.0": "收件方邮件系统内部错误",
    "5.4.1": "收件方域名DNS解析失败",
    "5.4.4": "路由无法到达收件域",
    "5.5.0": "协议错误（未分类）",
    "5.6.0": "邮件格式错误",
    "5.7.0": "策略拒绝（未分类）",
    "5.7.1": "被策略/安全规则拒绝（未授权）",
    "5.7.10": "被反垃圾策略拒绝",
    "5.7.12": "DMARC 拒绝",
    "5.7.23": "IP 被列入黑名单",
    "5.7.25": "反向 DNS 失败",
    "5.7.26": "SPF / DKIM 失败",
    "4.2.1": "邮箱已满（临时）",
    "4.2.2": "邮箱已满（临时，建议稍后重试）",
    "4.3.0": "邮件系统临时错误",
    "4.3.1": "邮件系统资源不足",
    "4.3.2": "系统维护/停机中",
    "4.4.1": "连接超时",
    "4.4.2": "连接中断",
    "4.4.3": "路由不可达（临时）",
    "4.4.4": "收件方DNS临时解析失败",
    "4.4.5": "服务器忙/灰名单（稍后重试）",
    "4.4.6": "邮件传输被延迟",
    "4.6.0": "邮件格式兼容性问题",
    "4.7.0": "临时性策略拒绝",
    "4.7.1": "灰名单/发件人未验证",
    "4.7.10": "速率限制（稍后重试）",
    "4.7.28": "临时信誉拦截",
}


CAMPAIGN_HINT_PATTERNS = [
    re.compile(r"[【\[]([^】\]]{2,40})[】\]]\s*(?:活动|营销|推广|邀请|通知|邮件)", re.IGNORECASE),
    re.compile(r"subject\s*:\s*.{0,10}(campaign|活动|促销|marketing|newsletter|邀请|推广)[^\n\r]{0,60}", re.IGNORECASE),
    re.compile(r"X-Campaign-Id\s*:\s*([^\n\r]+)", re.IGNORECASE),
    re.compile(r"X-Mailing-List\s*:\s*([^\n\r]+)", re.IGNORECASE),
    re.compile(r"List-Id\s*:\s*[^\n\r]*<([^>\n\r]+)>", re.IGNORECASE),
    re.compile(r"utm_(campaign|source|medium)=([^&\s\"'>]+)", re.IGNORECASE),
]
