我来帮你实现门店盘点盈亏API。首先让我了解一下当前工作目录的情况，然后规划整个实现方案。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00208
          
目录是空的，我来为你设计并实现完整的门店盘点盈亏API。让我先规划任务，然后逐步实现。

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
让我先检查Python环境，然后搭建项目结构。


        
            
toolName: run_command
            
status: success
          
command: python3 --version && pip3 list 2>/dev/null | grep -i fastapi undefined
          
FastAPI 已就绪。现在开始搭建项目结构并实现核心功能。




        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/requirements.txt
          
changes: undefined
          
现在创建项目核心文件。先建立数据模型层：





        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/__init__.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/models/__init__.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/services/__init__.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/api/__init__.py
          
changes: undefined
          
现在创建数据模型，定义请求、响应、规则和留痕结构：






        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/models/inventory.py
          
changes: undefined
          
数据模型已就绪。现在实现规则引擎和存储层：







        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在实现内存存储层和规则引擎：









        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/services/storage.py
          
changes: undefined
          
现在实现核心规则引擎，支持版本化规则、多维度判断和详细原因输出：









        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/services/rule_engine.py
          
changes: undefined
          
现在实现核心盘点服务，整合规则判定、重复检测、人工复核和留痕：


















        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在实现核心盘点服务层：


















        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/services/inventory_service.py
          
changes: undefined
          
现在实现API路由层：




















        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/api/inventory.py
          
changes: undefined
          
现在创建主应用入口：




















        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/app/main.py
          
changes: undefined
          
先验证应用能否正常启动：





















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00208 && python3 -c "from app.main import app; print('App imported successfully'); print('Routes:', [r.path for r in app.routes if hasattr(r, 'path')])" undefined
          
应用启动正常，所有路由已注册。现在启动开发服务器并准备验收样例：






















        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
启动开发服务器，并创建完整的验收测试脚本：


























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00208 && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
服务器启动似乎有终端环境问题。我先创建完整的验收测试脚本，用Python直接调用服务层进行验证：

























        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00208/test_acceptance.py
          
changes: undefined
          
现在运行验收测试脚本，验证所有样例：

























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00208 && python3 test_acceptance.py undefined
          
🎉 所有 8 个验收样例全部通过！让我更新进度并启动服务，让你可以直接查看 API 文档：


























        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在启动 API 服务，你可以直接访问交互式文档：



























        
            
toolName: run_command
            
status: running
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00208 && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
服务已启动成功！让我打开 API 文档预览：

        
            
toolName: open_preview
            
status: success
          
预览
          
---

## 🎉 门店盘点盈亏API 实现完成

所有 **8 个验收样例** 全部通过，API 服务已在 `http://localhost:8000` 启动。

### 📁 项目结构

```
yzz00208/
├── app/
│   ├── main.py                    # FastAPI 应用入口
│   ├── models/
│   │   └── inventory.py           # 数据模型（请求/响应/枚举）
│   ├── services/
│   │   ├── rule_engine.py         # 规则引擎（版本化规则）
│   │   ├── storage.py             # 内存存储层
│   │   └── inventory_service.py   # 核心业务服务
│   └── api/
│       └── inventory.py           # API 路由
├── test_acceptance.py             # 验收测试脚本（8个样例）
└── requirements.txt
```

### 🔑 核心设计要点

#### 1. **三重决策结果**（不用笼统失败）
| 决策 | 含义 | 典型场景 |
|------|------|----------|
| `PASS` 通过 | 所有规则校验通过 | 合规盘点 |
| `BLOCK` 拦截 | 严重异常，直接拒绝 | 材料缺失、物品丢失、金额超大 |
| `PENDING_REVIEW` 待复核 | 有异常但需人工确认 | 金额预警、物品损坏、材料存疑 |

#### 2. **命中来源分开处理**（`hit_source` 字段）
- `RULE` - 规则命中
- `MANUAL_REVIEW` - 人工复核
- `DUPLICATE_SUBMISSION` - 重复提交

#### 3. **可追溯编号**
格式：`INV-YYYYMMDDHHMMSS-XXXXXXXX`（时间戳 + 8位随机码）

#### 4. **三版规则引擎**
| 版本 | 规则数 | 新增能力 |
|------|--------|----------|
| v1.0 | 7 条 | 基础：材料、物品、金额、比例、时间 |
| v1.1 | 9 条 | 新增：物品状态异常、时间窗口跨度校验 |
| v2.0 | 11 条 | 新增：高风险组合校验（金额+比例+状态三重异常） |

### 🧪 验收样例（8个全部通过）

| # | 样例 | 验证点 |
|---|------|--------|
| 1 | 合规样例 | 正常盘点全部通过 |
| 2 | 超阈值样例 | 金额15000元触发拦截，比例15%触发复核 |
| 3 | 材料缺失样例 | 材料不完整直接拦截 |
| 4 | 历史回放样例 | 提交→复核→完整链路回放 |
| 5 | 重复提交样例 | 同业务号+同版本判定重复，不同版本不重复 |
| 6 | 边界条件 | 6个边界：阈值临界点、时间无效、版本不存在 |
| 7 | 可追溯编号 | 格式验证、查询验证 |
| 8 | 多版本规则 | v1.0/v1.1/v2.0 规则数和行为差异 |

### 🔗 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/inventory/check` | 盘点盈亏判定（核心接口） |
| GET | `/api/v1/inventory/trace/{trace_id}` | 按追溯号查询详情 |
| GET | `/api/v1/inventory/business/{business_no}` | 按业务编号查历史 |
| POST | `/api/v1/inventory/review/{trace_id}` | 人工复核 |
| GET | `/api/v1/inventory/replay/{business_no}` | 历史回放 |
| GET | `/api/v1/inventory/rules/versions` | 获取可用规则版本 |

👉 交互式 API 文档已在浏览器打开（Swagger UI），可以直接在线调试各接口。

运行验收测试：
```bash
python3 test_acceptance.py
```
