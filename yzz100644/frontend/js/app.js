const API = "/api";

async function request(url, options = {}) {
    const res = await fetch(API + url, {
        headers: { "Content-Type": "application/json" },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function loadModels() {
    const models = await request("/products/models");
    const select = document.getElementById("productModel");
    const select2 = document.getElementById("productModelSupervisor");
    const opts = `<option value="">全部型号 / 未指定</option>` +
        models.map(m => `<option value="${m.id}">${m.name}${m.is_old ? " (旧型号)" : ""}</option>`).join("");
    select.innerHTML = opts;
    if (select2) select2.innerHTML = opts;
    return models;
}

async function submitQuery() {
    const question = document.getElementById("question").value.trim();
    const modelId = document.getElementById("productModel").value;
    const agentId = document.getElementById("agentId").value.trim() || "default";
    if (!question) { alert("请输入问题"); return; }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 查询中...';

    try {
        const data = await request("/qa/query", {
            method: "POST",
            body: { question, product_model_id: modelId ? parseInt(modelId) : null, agent_id: agentId }
        });
        renderAnswer(data);
        window.currentQueryId = data.query_id;
    } catch (e) {
        alert("查询失败: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '查询答案';
    }
}

function renderAnswer(data) {
    const box = document.getElementById("answerBox");
    box.classList.remove("hidden");
    const typeClass = data.is_no_answer ? "no-answer" : (data.need_followup && data.need_followup.length ? "warning" : "");
    box.className = `answer-box ${typeClass}`;

    let html = `<div class="answer-title">${data.is_no_answer ? "⚠️ 未找到匹配答案" : "✅ 推荐答案"}</div>`;
    html += `<div style="white-space: pre-wrap;">${data.answer}</div>`;
    if (data.matched_question) {
        html += `<div class="answer-meta">匹配问题：${data.matched_question}</div>`;
    }
    html += `<div class="answer-meta">📖 来源：${data.source}</div>`;
    if (data.notes) {
        html += `<div class="answer-notes">📝 注意事项：${data.notes}</div>`;
    }
    if (data.need_followup && data.need_followup.length) {
        html += `<ul class="followup-list"><strong>🔔 请补问/提示用户：</strong>`;
        data.need_followup.forEach(f => {
            html += `<li>${f}</li>`;
        });
        html += `</ul>`;
    }
    html += `
        <div class="decision-section">
            <label class="card-title">客服处理：</label>
            <div class="btn-group mt-8">
                <button class="btn btn-success btn-sm" onclick="submitDecision(true)">采纳答案</button>
                <button class="btn btn-danger btn-sm" onclick="showModify()">需要改判</button>
            </div>
            <div id="modifyBox" class="hidden mt-16">
                <div class="form-group">
                    <label>改判后的答案</label>
                    <textarea id="modifiedAnswer" rows="3" placeholder="请输入你实际告知用户的答案..."></textarea>
                </div>
                <div class="form-group">
                    <label>改判原因</label>
                    <input id="modifyReason" type="text" placeholder="如：实际情况与文档不一致、用户特殊情况等" />
                </div>
                <button class="btn btn-primary btn-sm" onclick="submitDecision(false)">提交改判</button>
            </div>
        </div>
    `;
    box.innerHTML = html;
}

function showModify() {
    document.getElementById("modifyBox").classList.remove("hidden");
}

async function submitDecision(adopted) {
    if (!window.currentQueryId) { alert("请先进行查询"); return; }
    const body = {
        query_record_id: window.currentQueryId,
        adopted,
        modified_answer: adopted ? "" : document.getElementById("modifiedAnswer").value,
        modify_reason: adopted ? "" : document.getElementById("modifyReason").value,
    };
    try {
        await request("/qa/decision", { method: "POST", body });
        showToast(adopted ? "✅ 已记录采纳" : "✅ 已提交改判");
        document.getElementById("modifyBox").classList.add("hidden");
    } catch (e) {
        alert("提交失败: " + e.message);
    }
}

function showToast(msg) {
    const existing = document.getElementById("toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = "position:fixed;top:20px;right:20px;background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

async function loadStats() {
    const data = await request("/supervisor/stats");
    renderStats(data);
}

function renderStats(data) {
    const grid = document.getElementById("statsGrid");
    grid.innerHTML = `
        <div class="stat-card"><div class="stat-value">${data.total_queries}</div><div class="stat-label">总查询次数</div></div>
        <div class="stat-card success"><div class="stat-value">${data.answered_count}</div><div class="stat-label">成功回答</div></div>
        <div class="stat-card danger"><div class="stat-value">${data.no_answer_count}</div><div class="stat-label">未覆盖问题</div></div>
        <div class="stat-card"><div class="stat-value">${(data.adoption_rate * 100).toFixed(1)}%</div><div class="stat-label">答案采纳率</div></div>
        <div class="stat-card warning"><div class="stat-value">${data.modification_count}</div><div class="stat-label">改判次数</div></div>
        <div class="stat-card warning"><div class="stat-value">${data.missing_model_count}</div><div class="stat-label">缺型号需补问</div></div>
        <div class="stat-card"><div class="stat-value">${data.old_model_count}</div><div class="stat-label">旧型号咨询</div></div>
        <div class="stat-card"><div class="stat-value">${data.warranty_question_count}</div><div class="stat-label">保修类问题</div></div>
    `;

    const tbody1 = document.getElementById("noAnswerTable").querySelector("tbody");
    tbody1.innerHTML = data.top_no_answer.length ? data.top_no_answer.map(item => `
        <tr>
            <td>${item.question}</td>
            <td><span class="tag tag-danger">${item.count} 次</span></td>
            <td>${item.is_old_model ? '<span class="tag tag-warning">旧型号</span>' : '<span class="tag tag-info">新型号</span>'}</td>
        </tr>
    `).join("") : `<tr><td colspan="3" class="empty">暂无数据</td></tr>`;

    const tbody2 = document.getElementById("oldModelTable").querySelector("tbody");
    tbody2.innerHTML = data.old_model_problems.length ? data.old_model_problems.map(item => `
        <tr>
            <td>${item.question}</td>
            <td><span class="tag tag-danger">${item.count} 次</span></td>
        </tr>
    `).join("") : `<tr><td colspan="2" class="empty">暂无数据</td></tr>`;
}

async function loadDecisions() {
    const list = await request("/supervisor/decisions");
    const tbody = document.getElementById("decisionsTable").querySelector("tbody");
    tbody.innerHTML = list.length ? list.map(d => `
        <tr>
            <td style="max-width:240px;">${d.question}</td>
            <td>${d.agent_id}</td>
            <td>${d.adopted ? '<span class="tag tag-success">采纳</span>' : '<span class="tag tag-danger">改判</span>'}</td>
            <td style="max-width:200px;" class="text-muted">${d.modify_reason || "-"}</td>
            <td>${d.supervisor_reviewed ? '<span class="tag tag-success">已审</span>' : '<button class="btn btn-sm btn-secondary" onclick="reviewDecision(' + d.id + ')">审核</button>'}</td>
            <td class="text-muted">${d.created_at.slice(0, 16)}</td>
        </tr>
    `).join("") : `<tr><td colspan="6" class="empty">暂无数据</td></tr>`;
}

async function reviewDecision(id) {
    const note = prompt("请输入主管审核备注（可选）");
    await request(`/supervisor/decisions/${id}/review?note=${encodeURIComponent(note || "")}&reviewed=true`, { method: "POST" });
    loadDecisions();
}

function switchTab(name, tabEl) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + name).classList.remove("hidden");
    tabEl.classList.add("active");
    if (name === "supervisor") {
        loadStats();
        loadDecisions();
    }
}

async function importSampleData() {
    if (!confirm("将导入示例产品、说明书和FAQ数据，是否继续？")) return;
    try {
        const res = await fetch("sample_data.json");
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const fd = new FormData();
        fd.append("file", blob, "sample.json");
        const r = await fetch(API + "/products/import/json", { method: "POST", body: fd });
        const result = await r.json();
        alert("导入成功：新增 " + result.created_count + " 条记录");
        loadModels();
    } catch (e) {
        alert("导入失败：" + e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadModels();
    document.getElementById("submitBtn").addEventListener("click", submitQuery);
    document.getElementById("question").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitQuery();
        }
    });
});
