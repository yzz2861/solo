import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
from datetime import datetime

from database import init_db
from importers import import_tools_ledger, import_borrow_records, import_return_records
from services import (
    get_all_tools,
    get_tool_detail,
    get_overdue_tools,
    get_calibration_expiring_tools,
    get_returner_mismatch_tools,
    get_handover_summary,
    get_pending_reviews,
    save_review,
)
from report import export_handover_report


class HandoverApp:
    def __init__(self, root):
        self.root = root
        self.root.title("机场机务库房交接班管理系统")
        self.root.geometry("1100x700")
        self.root.minsize(900, 600)

        init_db()
        self._setup_style()
        self._build_ui()
        self.refresh_all()

    def _setup_style(self):
        style = ttk.Style()
        style.configure("Title.TLabel", font=("Microsoft YaHei", 14, "bold"))
        style.configure("Summary.TLabel", font=("Microsoft YaHei", 11))
        style.configure("Alert.TLabel", foreground="red", font=("Microsoft YaHei", 11, "bold"))
        style.configure("Treeview", font=("Microsoft YaHei", 10), rowheight=28)
        style.configure("Treeview.Heading", font=("Microsoft YaHei", 10, "bold"))

    def _build_ui(self):
        main_frame = ttk.Frame(self.root, padding=8)
        main_frame.pack(fill=tk.BOTH, expand=True)

        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=tk.X, pady=(0, 8))
        ttk.Label(title_frame, text="机场机务库房交接班管理系统", style="Title.TLabel").pack(side=tk.LEFT)
        ttk.Button(title_frame, text="刷新数据", command=self.refresh_all).pack(side=tk.RIGHT)

        self.summary_frame = ttk.LabelFrame(main_frame, text="交接概览", padding=8)
        self.summary_frame.pack(fill=tk.X, pady=(0, 8))
        self._build_summary()

        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True)

        self.tab_tools = ttk.Frame(notebook)
        self.tab_borrow = ttk.Frame(notebook)
        self.tab_return = ttk.Frame(notebook)
        self.tab_alert = ttk.Frame(notebook)
        self.tab_review = ttk.Frame(notebook)

        notebook.add(self.tab_tools, text="工具台账")
        notebook.add(self.tab_borrow, text="借出管理")
        notebook.add(self.tab_return, text="归还管理")
        notebook.add(self.tab_alert, text="异常预警")
        notebook.add(self.tab_review, text="复核管理")

        self._build_tools_tab()
        self._build_borrow_tab()
        self._build_return_tab()
        self._build_alert_tab()
        self._build_review_tab()

    def _build_summary(self):
        self.lbl_total = ttk.Label(self.summary_frame, text="工具总数：-", style="Summary.TLabel")
        self.lbl_total.grid(row=0, column=0, padx=15)

        self.lbl_instock = ttk.Label(self.summary_frame, text="在库：-", style="Summary.TLabel")
        self.lbl_instock.grid(row=0, column=1, padx=15)

        self.lbl_borrowed = ttk.Label(self.summary_frame, text="借出中：-", style="Summary.TLabel")
        self.lbl_borrowed.grid(row=0, column=2, padx=15)

        self.lbl_overdue = ttk.Label(self.summary_frame, text="超期未还：-", style="Alert.TLabel")
        self.lbl_overdue.grid(row=0, column=3, padx=15)

        self.lbl_cal = ttk.Label(self.summary_frame, text="校验过期：-", style="Alert.TLabel")
        self.lbl_cal.grid(row=0, column=4, padx=15)

        self.lbl_mismatch = ttk.Label(self.summary_frame, text="归还人不一致：-", style="Alert.TLabel")
        self.lbl_mismatch.grid(row=0, column=5, padx=15)

        self.lbl_pending = ttk.Label(self.summary_frame, text="待复核：-", style="Alert.TLabel")
        self.lbl_pending.grid(row=0, column=6, padx=15)

    def _build_tools_tab(self):
        top_frame = ttk.Frame(self.tab_tools, padding=8)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="状态筛选：").pack(side=tk.LEFT)
        self.tools_status_var = tk.StringVar(value="all")
        status_combo = ttk.Combobox(top_frame, textvariable=self.tools_status_var, width=12, state="readonly")
        status_combo["values"] = ["all", "in_stock", "borrowed", "returned", "sealed"]
        status_combo.pack(side=tk.LEFT, padx=4)
        status_combo.bind("<<ComboboxSelected>>", lambda e: self.refresh_tools())

        ttk.Label(top_frame, text="搜索：").pack(side=tk.LEFT, padx=(15, 4))
        self.tools_keyword_var = tk.StringVar()
        keyword_entry = ttk.Entry(top_frame, textvariable=self.tools_keyword_var, width=20)
        keyword_entry.pack(side=tk.LEFT)
        keyword_entry.bind("<Return>", lambda e: self.refresh_tools())

        ttk.Button(top_frame, text="查询", command=self.refresh_tools).pack(side=tk.LEFT, padx=4)
        ttk.Button(top_frame, text="导入工具台账", command=self.import_tools).pack(side=tk.RIGHT)
        ttk.Button(top_frame, text="导出交接报告", command=self.export_report).pack(side=tk.RIGHT, padx=4)

        columns = ("tool_no", "tool_name", "specification", "category",
                   "calibration_expiry", "status", "current_borrower", "current_borrow_date")
        self.tools_tree = ttk.Treeview(self.tab_tools, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "tool_name": ("工具名称", 150),
            "specification": ("规格型号", 150),
            "category": ("类别", 100),
            "calibration_expiry": ("校验有效期", 110),
            "status": ("状态", 80),
            "current_borrower": ("当前借用人", 100),
            "current_borrow_date": ("借出日期", 110),
        }
        for col, (text, width) in headings.items():
            self.tools_tree.heading(col, text=text)
            self.tools_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_tools, orient=tk.VERTICAL, command=self.tools_tree.yview)
        self.tools_tree.configure(yscrollcommand=scrollbar.set)

        self.tools_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=(0, 8))
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=(0, 8))

        self.tools_tree.bind("<Double-1>", lambda e: self.show_tool_detail())

    def _build_borrow_tab(self):
        top_frame = ttk.Frame(self.tab_borrow, padding=8)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="借出记录管理").pack(side=tk.LEFT)
        ttk.Button(top_frame, text="导入借出CSV", command=self.import_borrow).pack(side=tk.RIGHT)

        columns = ("tool_no", "borrower", "borrow_date", "expected_return_date",
                   "status", "borrow_remark")
        self.borrow_tree = ttk.Treeview(self.tab_borrow, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "borrower": ("借用人", 100),
            "borrow_date": ("借出日期", 110),
            "expected_return_date": ("预计归还日期", 120),
            "status": ("状态", 80),
            "borrow_remark": ("备注", 200),
        }
        for col, (text, width) in headings.items():
            self.borrow_tree.heading(col, text=text)
            self.borrow_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_borrow, orient=tk.VERTICAL, command=self.borrow_tree.yview)
        self.borrow_tree.configure(yscrollcommand=scrollbar.set)

        self.borrow_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=(0, 8))
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=(0, 8))

    def _build_return_tab(self):
        top_frame = ttk.Frame(self.tab_return, padding=8)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="归还记录管理").pack(side=tk.LEFT)
        ttk.Button(top_frame, text="导入归还JSON", command=self.import_return).pack(side=tk.RIGHT)

        columns = ("tool_no", "returner", "return_date", "status", "borrower", "return_remark")
        self.return_tree = ttk.Treeview(self.tab_return, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "returner": ("归还人", 100),
            "return_date": ("归还日期", 110),
            "status": ("状态", 80),
            "borrower": ("原借用人", 100),
            "return_remark": ("备注", 200),
        }
        for col, (text, width) in headings.items():
            self.return_tree.heading(col, text=text)
            self.return_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_return, orient=tk.VERTICAL, command=self.return_tree.yview)
        self.return_tree.configure(yscrollcommand=scrollbar.set)

        self.return_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=(0, 8))
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=(0, 8))

    def _build_alert_tab(self):
        nb = ttk.Notebook(self.tab_alert)
        nb.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        self.tab_overdue = ttk.Frame(nb)
        self.tab_cal = ttk.Frame(nb)
        self.tab_mismatch = ttk.Frame(nb)

        nb.add(self.tab_overdue, text="超期未还")
        nb.add(self.tab_cal, text="校验过期/临期")
        nb.add(self.tab_mismatch, text="归还人不一致")

        self._build_overdue_tab()
        self._build_cal_tab()
        self._build_mismatch_tab()

    def _build_overdue_tab(self):
        columns = ("tool_no", "tool_name", "borrower", "borrow_date",
                   "expected_return_date", "days_overdue")
        self.overdue_tree = ttk.Treeview(self.tab_overdue, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "tool_name": ("工具名称", 150),
            "borrower": ("借用人", 100),
            "borrow_date": ("借出日期", 110),
            "expected_return_date": ("应还日期", 120),
            "days_overdue": ("超期天数", 100),
        }
        for col, (text, width) in headings.items():
            self.overdue_tree.heading(col, text=text)
            self.overdue_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_overdue, orient=tk.VERTICAL, command=self.overdue_tree.yview)
        self.overdue_tree.configure(yscrollcommand=scrollbar.set)

        self.overdue_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=8)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=8)

    def _build_cal_tab(self):
        top_frame = ttk.Frame(self.tab_cal, padding=8)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="临期天数阈值：").pack(side=tk.LEFT)
        self.cal_days_var = tk.StringVar(value="30")
        ttk.Entry(top_frame, textvariable=self.cal_days_var, width=8).pack(side=tk.LEFT, padx=4)
        ttk.Button(top_frame, text="刷新", command=self.refresh_cal).pack(side=tk.LEFT, padx=4)

        columns = ("tool_no", "tool_name", "calibration_expiry", "status", "is_expired")
        self.cal_tree = ttk.Treeview(self.tab_cal, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "tool_name": ("工具名称", 150),
            "calibration_expiry": ("校验有效期", 120),
            "status": ("工具状态", 100),
            "is_expired": ("过期状态", 100),
        }
        for col, (text, width) in headings.items():
            self.cal_tree.heading(col, text=text)
            self.cal_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_cal, orient=tk.VERTICAL, command=self.cal_tree.yview)
        self.cal_tree.configure(yscrollcommand=scrollbar.set)

        self.cal_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=8)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=8)

    def _build_mismatch_tab(self):
        columns = ("tool_no", "tool_name", "borrower", "borrow_date",
                   "returner", "return_date")
        self.mismatch_tree = ttk.Treeview(self.tab_mismatch, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "tool_name": ("工具名称", 150),
            "borrower": ("借用人", 100),
            "borrow_date": ("借出日期", 110),
            "returner": ("归还人", 100),
            "return_date": ("归还日期", 110),
        }
        for col, (text, width) in headings.items():
            self.mismatch_tree.heading(col, text=text)
            self.mismatch_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_mismatch, orient=tk.VERTICAL, command=self.mismatch_tree.yview)
        self.mismatch_tree.configure(yscrollcommand=scrollbar.set)

        self.mismatch_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=8)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=8)

    def _build_review_tab(self):
        top_frame = ttk.Frame(self.tab_review, padding=8)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="待复核工具清单").pack(side=tk.LEFT)
        ttk.Button(top_frame, text="刷新", command=self.refresh_reviews).pack(side=tk.RIGHT)

        columns = ("tool_no", "tool_name", "borrower", "returner",
                   "borrow_date", "return_date", "review_status")
        self.review_tree = ttk.Treeview(self.tab_review, columns=columns, show="headings")

        headings = {
            "tool_no": ("工具编号", 120),
            "tool_name": ("工具名称", 150),
            "borrower": ("借用人", 100),
            "returner": ("归还人", 100),
            "borrow_date": ("借出日期", 110),
            "return_date": ("归还日期", 110),
            "review_status": ("复核状态", 100),
        }
        for col, (text, width) in headings.items():
            self.review_tree.heading(col, text=text)
            self.review_tree.column(col, width=width, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.tab_review, orient=tk.VERTICAL, command=self.review_tree.yview)
        self.review_tree.configure(yscrollcommand=scrollbar.set)

        self.review_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0), pady=8)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 8), pady=8)

        bottom_frame = ttk.Frame(self.tab_review, padding=8)
        bottom_frame.pack(fill=tk.X)

        ttk.Button(bottom_frame, text="编辑复核意见", command=self.edit_review).pack(side=tk.LEFT)
        ttk.Button(bottom_frame, text="封存工具", command=self.seal_tool).pack(side=tk.LEFT, padx=8)
        ttk.Button(bottom_frame, text="导出交接报告", command=self.export_report).pack(side=tk.RIGHT)

        self.review_tree.bind("<Double-1>", lambda e: self.edit_review())

    def refresh_all(self):
        self.refresh_summary()
        self.refresh_tools()
        self.refresh_borrow()
        self.refresh_return()
        self.refresh_alerts()
        self.refresh_reviews()

    def refresh_summary(self):
        s = get_handover_summary()
        self.lbl_total.config(text=f"工具总数：{s['total_tools']}")
        self.lbl_instock.config(text=f"在库：{s['in_stock_count']}")
        self.lbl_borrowed.config(text=f"借出中：{s['borrowed_count']}")
        self.lbl_overdue.config(text=f"超期未还：{s['overdue_count']}")
        self.lbl_cal.config(text=f"校验过期：{s['cal_expired_count']}")
        self.lbl_mismatch.config(text=f"归还人不一致：{s['mismatch_count']}")
        self.lbl_pending.config(text=f"待复核：{s['pending_review_count']}")

    def refresh_tools(self):
        for item in self.tools_tree.get_children():
            self.tools_tree.delete(item)

        status = self.tools_status_var.get()
        keyword = self.tools_keyword_var.get()
        tools = get_all_tools(status_filter=status, keyword=keyword)

        status_map = {
            "in_stock": "在库",
            "borrowed": "借出中",
            "returned": "已归还",
            "sealed": "已封存",
        }

        for t in tools:
            self.tools_tree.insert("", tk.END, values=(
                t["tool_no"],
                t["tool_name"],
                t.get("specification", "") or "",
                t.get("category", "") or "",
                t.get("calibration_expiry", "") or "",
                status_map.get(t["status"], t["status"]),
                t.get("current_borrower", "") or "",
                t.get("current_borrow_date", "") or "",
            ))

    def refresh_borrow(self):
        for item in self.borrow_tree.get_children():
            self.borrow_tree.delete(item)

        from database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM borrow_records ORDER BY borrow_date DESC, id DESC LIMIT 500")
        rows = cursor.fetchall()
        conn.close()

        status_map = {"borrowed": "借出中", "returned": "已归还"}

        for r in rows:
            self.borrow_tree.insert("", tk.END, values=(
                r["tool_no"],
                r["borrower"],
                r["borrow_date"],
                r["expected_return_date"] or "",
                status_map.get(r["status"], r["status"]),
                r["borrow_remark"] or "",
            ))

    def refresh_return(self):
        for item in self.return_tree.get_children():
            self.return_tree.delete(item)

        from database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, b.borrower
            FROM return_records r
            LEFT JOIN borrow_records b ON r.borrow_id = b.id
            ORDER BY r.return_date DESC, r.id DESC LIMIT 500
        """)
        rows = cursor.fetchall()
        conn.close()

        status_map = {"returned": "已归还", "reviewed": "已复核"}

        for r in rows:
            self.return_tree.insert("", tk.END, values=(
                r["tool_no"],
                r["returner"],
                r["return_date"],
                status_map.get(r["status"], r["status"]),
                r["borrower"] or "未匹配",
                r["return_remark"] or "",
            ))

    def refresh_alerts(self):
        self.refresh_overdue()
        self.refresh_cal()
        self.refresh_mismatch()

    def refresh_overdue(self):
        for item in self.overdue_tree.get_children():
            self.overdue_tree.delete(item)

        from datetime import date
        today = date.today()
        items = get_overdue_tools()

        for item in items:
            try:
                from datetime import datetime
                exp_date = datetime.strptime(item["expected_return_date"], "%Y-%m-%d").date()
                days = (today - exp_date).days
                days_str = f"{days} 天"
            except:
                days_str = "-"

            self.overdue_tree.insert("", tk.END, values=(
                item["tool_no"],
                item.get("tool_name", "") or "",
                item["borrower"],
                item["borrow_date"],
                item["expected_return_date"] or "",
                days_str,
            ))

    def refresh_cal(self):
        for item in self.cal_tree.get_children():
            self.cal_tree.delete(item)

        try:
            days = int(self.cal_days_var.get())
        except:
            days = 30

        items = get_calibration_expiring_tools(days_threshold=days)

        status_map = {
            "in_stock": "在库",
            "borrowed": "借出中",
            "returned": "已归还",
            "sealed": "已封存",
        }

        for item in items:
            expired_status = "⚠ 已过期" if item.get("is_expired") else "临期"
            self.cal_tree.insert("", tk.END, values=(
                item["tool_no"],
                item["tool_name"],
                item.get("calibration_expiry", "") or "",
                status_map.get(item["status"], item["status"]),
                expired_status,
            ))

    def refresh_mismatch(self):
        for item in self.mismatch_tree.get_children():
            self.mismatch_tree.delete(item)

        items = get_returner_mismatch_tools()

        for item in items:
            self.mismatch_tree.insert("", tk.END, values=(
                item["tool_no"],
                item.get("tool_name", "") or "",
                item["borrower"],
                item["borrow_date"],
                item["returner"],
                item["return_date"],
            ))

    def refresh_reviews(self):
        for item in self.review_tree.get_children():
            self.review_tree.delete(item)

        items = get_pending_reviews()

        for item in items:
            self.review_tree.insert("", tk.END, iid=str(item["id"]), values=(
                item["tool_no"],
                item.get("tool_name", "") or "",
                item.get("borrower", "") or "",
                item.get("returner", "") or "",
                item.get("borrow_date", "") or "",
                item.get("return_date", "") or "",
                "待复核",
            ))

    def import_tools(self):
        path = filedialog.askopenfilename(title="选择工具台账CSV",
                                          filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")])
        if path:
            result = import_tools_ledger(path)
            messagebox.showinfo("导入结果", result["message"])
            self.refresh_all()

    def import_borrow(self):
        path = filedialog.askopenfilename(title="选择借出记录CSV",
                                          filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")])
        if path:
            result = import_borrow_records(path)
            messagebox.showinfo("导入结果", result["message"])
            self.refresh_all()

    def import_return(self):
        path = filedialog.askopenfilename(title="选择归还记录JSON",
                                          filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")])
        if path:
            result = import_return_records(path)
            messagebox.showinfo("导入结果", result["message"])
            self.refresh_all()

    def show_tool_detail(self):
        selected = self.tools_tree.selection()
        if not selected:
            return
        values = self.tools_tree.item(selected[0], "values")
        tool_no = values[0]
        self._show_detail_dialog(tool_no)

    def _show_detail_dialog(self, tool_no):
        detail = get_tool_detail(tool_no)

        dlg = tk.Toplevel(self.root)
        dlg.title(f"工具详情 - {tool_no}")
        dlg.geometry("600x500")
        dlg.transient(self.root)

        info_frame = ttk.LabelFrame(dlg, text="基本信息", padding=8)
        info_frame.pack(fill=tk.X, padx=8, pady=8)

        tool = detail["tool"]
        if tool:
            rows = [
                ("工具编号", tool["tool_no"]),
                ("工具名称", tool["tool_name"]),
                ("规格型号", tool.get("specification", "") or ""),
                ("类别", tool.get("category", "") or ""),
                ("校验有效期", tool.get("calibration_expiry", "") or ""),
                ("状态", tool.get("status", "") or ""),
                ("存放位置", tool.get("location", "") or ""),
            ]
            for i, (label, value) in enumerate(rows):
                ttk.Label(info_frame, text=f"{label}：").grid(row=i, column=0, sticky=tk.W, pady=2)
                ttk.Label(info_frame, text=value).grid(row=i, column=1, sticky=tk.W, pady=2)

        nb = ttk.Notebook(dlg)
        nb.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))

        borrow_tab = ttk.Frame(nb)
        return_tab = ttk.Frame(nb)
        review_tab = ttk.Frame(nb)
        nb.add(borrow_tab, text="借出记录")
        nb.add(return_tab, text="归还记录")
        nb.add(review_tab, text="复核记录")

        borrow_txt = scrolledtext.ScrolledText(borrow_tab, wrap=tk.WORD)
        borrow_txt.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        for r in detail["borrow_records"]:
            borrow_txt.insert(tk.END, f"日期: {r['borrow_date']}  借用人: {r['borrower']}  "
                                      f"状态: {r['status']}  备注: {r.get('borrow_remark','') or ''}\n")

        return_txt = scrolledtext.ScrolledText(return_tab, wrap=tk.WORD)
        return_txt.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        for r in detail["return_records"]:
            return_txt.insert(tk.END, f"日期: {r['return_date']}  归还人: {r['returner']}  "
                                      f"状态: {r['status']}  备注: {r.get('return_remark','') or ''}\n")

        review_txt = scrolledtext.ScrolledText(review_tab, wrap=tk.WORD)
        review_txt.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        for r in detail["reviews"]:
            review_txt.insert(tk.END, f"日期: {r.get('review_date','') or ''}  "
                                      f"复核人: {r.get('reviewer','') or ''}  "
                                      f"封存: {'是' if r.get('is_sealed') else '否'}\n"
                                      f"意见: {r.get('review_opinion','') or ''}\n\n")

        btn_frame = ttk.Frame(dlg)
        btn_frame.pack(fill=tk.X, padx=8, pady=(0, 8))
        ttk.Button(btn_frame, text="关闭", command=dlg.destroy).pack(side=tk.RIGHT)

    def edit_review(self):
        selected = self.review_tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一条待复核记录")
            return

        review_id = selected[0]
        values = self.review_tree.item(selected[0], "values")
        tool_no = values[0]

        from database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reviews WHERE id = ?", (review_id,))
        review = cursor.fetchone()
        conn.close()

        if not review:
            messagebox.showerror("错误", "记录不存在")
            return

        dlg = tk.Toplevel(self.root)
        dlg.title(f"编辑复核意见 - {tool_no}")
        dlg.geometry("500x400")
        dlg.transient(self.root)
        dlg.grab_set()

        form_frame = ttk.Frame(dlg, padding=12)
        form_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(form_frame, text="复核人：").grid(row=0, column=0, sticky=tk.W, pady=6)
        reviewer_var = tk.StringVar(value=review.get("reviewer", "") or "")
        ttk.Entry(form_frame, textvariable=reviewer_var, width=30).grid(row=0, column=1, sticky=tk.W, pady=6)

        ttk.Label(form_frame, text="复核意见：").grid(row=1, column=0, sticky=tk.NW, pady=6)
        opinion_text = scrolledtext.ScrolledText(form_frame, width=40, height=10)
        opinion_text.grid(row=1, column=1, sticky=tk.W, pady=6)
        opinion_text.insert(tk.END, review.get("review_opinion", "") or "")

        sealed_var = tk.BooleanVar(value=bool(review.get("is_sealed")))
        ttk.Checkbutton(form_frame, text="封存该工具", variable=sealed_var).grid(row=2, column=1, sticky=tk.W, pady=6)

        ttk.Label(form_frame, text="封存人：").grid(row=3, column=0, sticky=tk.W, pady=6)
        sealed_by_var = tk.StringVar(value=review.get("sealed_by", "") or "")
        ttk.Entry(form_frame, textvariable=sealed_by_var, width=30).grid(row=3, column=1, sticky=tk.W, pady=6)

        btn_frame = ttk.Frame(dlg, padding=(0, 8))
        btn_frame.pack(fill=tk.X, padx=12, pady=(0, 12))

        def save():
            save_review(
                tool_no=tool_no,
                borrow_id=review["borrow_id"],
                return_id=review["return_id"],
                review_opinion=opinion_text.get("1.0", tk.END).strip(),
                reviewer=reviewer_var.get().strip(),
                is_sealed=sealed_var.get(),
                sealed_by=sealed_by_var.get().strip(),
            )
            messagebox.showinfo("提示", "复核意见已保存")
            dlg.destroy()
            self.refresh_all()

        ttk.Button(btn_frame, text="保存", command=save).pack(side=tk.RIGHT)
        ttk.Button(btn_frame, text="取消", command=dlg.destroy).pack(side=tk.RIGHT, padx=8)

    def seal_tool(self):
        selected = self.review_tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一条记录")
            return

        if not messagebox.askyesno("确认", "确定要封存该工具吗？"):
            return

        review_id = selected[0]
        values = self.review_tree.item(selected[0], "values")
        tool_no = values[0]

        from database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reviews WHERE id = ?", (review_id,))
        review = cursor.fetchone()
        conn.close()

        if review:
            save_review(
                tool_no=tool_no,
                borrow_id=review["borrow_id"],
                return_id=review["return_id"],
                review_opinion=review.get("review_opinion", "") or "交接封存",
                reviewer="系统",
                is_sealed=True,
                sealed_by="交接员",
            )
            messagebox.showinfo("提示", "工具已封存")
            self.refresh_all()

    def export_report(self):
        path = filedialog.askdirectory(title="选择导出目录")
        if path:
            result = export_handover_report(output_dir=path, format="txt")
            export_handover_report(output_dir=path, format="csv")
            messagebox.showinfo("导出成功", f"交接报告已导出到：\n{path}\n\n已生成 TXT 和 CSV 两种格式")


def main():
    root = tk.Tk()
    app = HandoverApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
