我来帮你设计并实现这个"法援案件补贴核算API"。首先让我了解一下当前项目的结构。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00205
          
工作目录是空的，我来从头创建这个项目。让我先规划好任务清单。

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
先创建项目配置文件和目录结构：

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/package.json
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00205 && npm install undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在创建常量定义与数据模型：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/constants/index.js
          
changes: undefined
          
现在创建规则引擎模块：




        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/services/ruleEngine.js
          
changes: undefined
          
现在创建审计留痕模块：






        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/services/auditService.js
          
changes: undefined
          
现在创建异常解释与任务状态模块：








        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/services/exceptionService.js
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在创建主 API 控制器：










        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/controllers/subsidyController.js
          
changes: undefined
          
现在创建路由文件：


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/routes/subsidy.js
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在编写入口文件与中间件：








        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/src/app.js
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在启动服务并验证 API 可用性：





        
            
toolName: run_command
            
status: running
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00205 && npm start undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
服务已成功启动！现在来测试核心接口：







        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:3000/health | python3 -m json.tool undefined
          

        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:3000/health undefined
          
让我用浏览器工具来验证 API：





        
            
toolName: view_folder
            
status: success
          
/Users/bill/.trae-cn/mcps/s_yzz00205-bcb94fb7/solo_agent/integrated_browser
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/.trae-cn/mcps/s_yzz00205-bcb94fb7/solo_agent/integrated_browser/tools/browser_navigate.json
          

        
            
toolName: browser_navigate
            
status: success
          
toolName: browser_navigate
params: {"url":"http://localhost:3000/","newTab":true}
          
页面已加载。让我用 Node 脚本测试核心 API 功能：







        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00205/test/api.test.js
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00205 && node test/api.test.js undefined
          
所有测试通过！让我完成最后的任务标记：










        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
**法援案件补贴核算 API** 已开发完成并通过所有测试 ✅

## 项目结构

```
yzz00205/
├── src/
│   ├── app.js                          # 入口文件
│   ├── constants/
│   │   └── index.js                    # 常量定义（状态、标签、规则版本等）
│   ├── controllers/
│   │   └── subsidyController.js        # API 控制器
│   ├── routes/
│   │   └── subsidy.js                  # 路由配置
│   └── services/
│       ├── ruleEngine.js               # 规则引擎
│       ├── auditService.js             # 审计留痕服务
│       └── exceptionService.js         # 异常解释与任务状态
├── test/
│   └── api.test.js                     # 接口测试脚本
└── package.json
```

## 核心 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/subsidy/calculate` | 补贴核算主接口 |
| GET | `/api/subsidy/audit/:auditNo` | 查询审计详情 |
| GET | `/api/subsidy/audit/:auditNo/replay` | 数据回放 |
| GET | `/api/subsidy/business/:businessNo/history` | 业务历史记录 |
| GET | `/api/subsidy/audits` | 审计列表（分页） |
| POST | `/api/subsidy/audit/:auditNo/review` | 人工复核 |

## 设计亮点

### 1. 输入参数
- `businessNo` - 业务编号
- `objectStatus` - 对象状态（类别、是否偏远、是否疑难等）
- `timeWindow` - 时间窗口（开始/结束日期、天数）
- `ruleVersion` - 规则版本（v1.0 / v1.1 / v2.0）
- `operator` - 操作人

### 2. 返回结果
- `conclusion` - 业务结论（通过/不通过/待补充/待复核）
- `riskTags` - 风险标签数组
- `nextAction` - 下一步动作
- `auditNo` - 审计编号

### 3. 三类场景分开处理（不笼统失败）

**规则命中**：返回具体命中的规则列表、每条规则的名称/原因/金额、计算口径明细

**人工复核**：标记 `manual_review` 标签，返回复核表单字段、目标角色、处理建议

**重复提交**：标记 `duplicate_processing` 标签，返回上次处理的审计编号和时间，建议走变更/撤销流程

### 4. 验收准备四场景
- ✅ **正常记录**：规则命中 + 通过
- ✅ **缺字段**：`missing_fields` 标签 + 补充信息动作 + 具体缺失字段列表
- ✅ **规则冲突**：`rule_conflict` 标签 + 解决冲突动作 + 冲突详情（规则ID/级别/描述/建议）
- ✅ **重复处理**：`duplicate_processing` 标签 + 重新处理动作 + 上次记录关联

### 5. 四项检查能力
- ✅ **计算口径**：`calculation` 对象包含基础金额、各项调整明细、年度封顶、最终金额
- ✅ **异常解释**：每个风险标签都有标题、描述、影响、建议的结构化解释
- ✅ **任务状态**：当前状态、处理人、时间线、下一步动作详情
- ✅ **数据回放**：分步骤回放输入接收→规则匹配→风险检测→结果输出的完整过程

服务已在 `http://localhost:3000` 启动运行，你可以通过 `OpenPreview` 查看，或运行 `node test/api.test.js` 重新执行测试。
