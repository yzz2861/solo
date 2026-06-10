import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os

from db import init_db, get_all_stores, get_all_batches
from importer import import_stock_csv, import_stocktake_csv, import_transfer_json
from diff_engine import (
    compute_diff, save_review, get_diff_summary, export_store_report
)


class InventoryCheckApp:
    def __init__(self, root):
        self.root = root
        self.root.title("连锁便利店盘点差异管理工具")
        self.root.geometry("1400x800")
        self.root.minsize(1200, 700)

        self.current_store = None
        self.filter_vars = {
            "has_diff": tk.BooleanVar(value=True),
            "negative_stock": tk.BooleanVar(value=False),
            "late_transfer": tk.BooleanVar(value=False),
            "review_modified": tk.BooleanVar(value=False),
            "no_review": tk.BooleanVar(value=False),
        }
        self.diff_data = []
        self.selected_row = None

        self._setup_styles()
        self._build_ui()
        self._refresh_stores()
        self._refresh_batches()

    def _setup_styles(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure("Title.TLabel", font=("微软雅黑", 14, "bold"))
        style.configure("Section.TLabelframe.Label", font=("微软雅黑", 10, "bold"))
        style.configure("Diff.Treeview", rowheight=24)
        style.configure("Diff.Treeview.Heading", font=("微软雅黑", 9, "bold"))
        style.map("Diff.Treeview",
                  background=[("selected", "#3b82f6")],
                  foreground=[("selected", "white")])

    def _build_ui(self):
        main_paned = ttk.Panedwindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        left_frame = ttk.Frame(main_paned, width=280)
        main_paned.add(left_frame, weight=0)

        right_frame = ttk.Frame(main_paned)
        main_paned.add(right_frame, weight=1)

        self._build_left_panel(left_frame)
        self._build_right_panel(right_frame)

        status_bar = ttk.Frame(self.root)
        status_bar.pack(fill=tk.X, side=tk.BOTTOM)
        self.status_var = tk.StringVar(value="就绪")
        ttk.Label(status_bar, textvariable=self.status_var, anchor="w",
                  font=("微软雅黑", 9), padding=(8, 4)).pack(fill=tk.X)

    def _build_left_panel(self, parent):
        import_frame = ttk.LabelFrame(parent, text=" 数据导入 ", style="Section.TLabelframe")
        import_frame.pack(fill=tk.X, pady=(0, 8))

        btn_opts = dict(fill=tk.X, padx=8, pady=3)
        ttk.Button(import_frame, text="导入库存台账 CSV", command=self._import_stock).pack(**btn_opts)
        ttk.Button(import_frame, text="导入盘点扫码 CSV", command=self._import_stocktake).pack(**btn_opts)
        ttk.Button(import_frame, text="导入调拨 JSON", command=self._import_transfer).pack(**btn_opts)

        batch_frame = ttk.LabelFrame(parent, text=" 导入记录 ", style="Section.TLabelframe")
        batch_frame.pack(fill=tk.X, pady=(0, 8))
        self.batch_listbox = tk.Listbox(batch_frame, height=5, font=("微软雅黑", 9))
        self.batch_listbox.pack(fill=tk.X, padx=8, pady=6)

        store_frame = ttk.LabelFrame(parent, text=" 门店列表 ", style="Section.TLabelframe")
        store_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        self.store_tree = ttk.Treeview(store_frame, columns=("code", "diff_cnt", "unreview"),
                                       show="headings", height=15, selectmode="browse")
        self.store_tree.heading("code", text="门店编码")
        self.store_tree.heading("diff_cnt", text="差异SKU")
        self.store_tree.heading("unreview", text="未复核")
        self.store_tree.column("code", width=100, anchor="w")
        self.store_tree.column("diff_cnt", width=60, anchor="center")
        self.store_tree.column("unreview", width=60, anchor="center")
        self.store_tree.pack(fill=tk.BOTH, expand=True, padx=6, pady=6)
        self.store_tree.bind("<<TreeviewSelect>>", self._on_store_select)

        ttk.Button(parent, text="导出当前门店报告", command=self._export_report).pack(fill=tk.X, pady=4)
        ttk.Button(parent, text="导出所有门店报告", command=self._export_all_reports).pack(fill=tk.X, pady=4)

    def _build_right_panel(self, parent):
        top_bar = ttk.Frame(parent)
        top_bar.pack(fill=tk.X, pady=(0, 6))

        ttk.Label(top_bar, text="筛选：", font=("微软雅黑", 10)).pack(side=tk.LEFT, padx=(2, 8))

        filters = [
            ("仅显示有差异", "has_diff"),
            ("负库存", "negative_stock"),
            ("调拨晚到", "late_transfer"),
            ("复核被改写", "review_modified"),
            ("未复核", "no_review"),
        ]
        for label, key in filters:
            cb = ttk.Checkbutton(top_bar, text=label, variable=self.filter_vars[key],
                                 command=self._apply_filters)
            cb.pack(side=tk.LEFT, padx=4)

        ttk.Button(top_bar, text="刷新数据", command=self._refresh_all).pack(side=tk.RIGHT, padx=4)

        search_frame = ttk.Frame(top_bar)
        search_frame.pack(side=tk.RIGHT, padx=8)
        ttk.Label(search_frame, text="搜索SKU：").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *args: self._apply_filters())
        ttk.Entry(search_frame, textvariable=self.search_var, width=18).pack(side=tk.LEFT)

        table_frame = ttk.Frame(parent)
        table_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("sku_code", "sku_name", "book_qty", "actual_qty",
                   "transfer_in", "transfer_out", "net_transfer", "diff_qty",
                   "neg_stock", "late_trans", "reviewed", "modified", "opinion")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings",
                                 selectmode="browse", style="Diff.Treeview")

        col_config = {
            "sku_code": ("SKU编码", 100, "w"),
            "sku_name": ("商品名称", 180, "w"),
            "book_qty": ("账面", 70, "e"),
            "actual_qty": ("实盘", 70, "e"),
            "transfer_in": ("调拨入", 70, "e"),
            "transfer_out": ("调拨出", 70, "e"),
            "net_transfer": ("净调拨", 70, "e"),
            "diff_qty": ("差异", 70, "e"),
            "neg_stock": ("负库存", 60, "center"),
            "late_trans": ("晚到", 60, "center"),
            "reviewed": ("已复核", 60, "center"),
            "modified": ("被改写", 60, "center"),
            "opinion": ("复核意见", 200, "w"),
        }
        for col, (text, width, anchor) in col_config.items():
            self.tree.heading(col, text=text)
            self.tree.column(col, width=width, anchor=anchor)

        tree_scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        tree_scroll_x = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(yscrollcommand=tree_scroll_y.set, xscrollcommand=tree_scroll_x.set)

        self.tree.grid(row=0, column=0, sticky="nsew")
        tree_scroll_y.grid(row=0, column=1, sticky="ns")
        tree_scroll_x.grid(row=1, column=0, sticky="ew")
        table_frame.rowconfigure(0, weight=1)
        table_frame.columnconfigure(0, weight=1)

        self.tree.tag_configure("diff_pos", background="#fef3c7")
        self.tree.tag_configure("diff_neg", background="#fee2e2")
        self.tree.tag_configure("no_diff", background="#f0fdf4")
        self.tree.tag_configure("neg_stock", background="#fecaca")
        self.tree.tag_configure("late_trans", background="#fde68a")
        self.tree.tag_configure("modified", background="#ddd6fe")

        self.tree.bind("<<TreeviewSelect>>", self._on_row_select)

        review_frame = ttk.LabelFrame(parent, text=" 复核意见编辑 ", style="Section.TLabelframe", height=160)
        review_frame.pack(fill=tk.X, pady=(8, 0))
        review_frame.pack_propagate(False)

        info_row = ttk.Frame(review_frame)
        info_row.pack(fill=tk.X, padx=8, pady=4)
        self.selected_info_var = tk.StringVar(value="请选择一条记录以编辑复核意见")
        ttk.Label(info_row, textvariable=self.selected_info_var, font=("微软雅黑", 10, "bold"),
                  foreground="#1f2937").pack(side=tk.LEFT)

        self.original_opinion_var = tk.StringVar(value="")
        ttk.Label(info_row, textvariable=self.original_opinion_var,
                  foreground="#6b7280", font=("微软雅黑", 9)).pack(side=tk.RIGHT)

        input_row = ttk.Frame(review_frame)
        input_row.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        ttk.Label(input_row, text="复核意见：").pack(side=tk.LEFT, anchor="n")
        self.review_text = tk.Text(input_row, height=4, font=("微软雅黑", 10),
                                   wrap=tk.WORD, relief=tk.SOLID, borderwidth=1)
        self.review_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(4, 0))

        btn_row = ttk.Frame(review_frame)
        btn_row.pack(fill=tk.X, padx=8, pady=6)
        ttk.Button(btn_row, text="保存复核意见", command=self._save_review_opinion,
                   width=16).pack(side=tk.RIGHT)

        quick_frame = ttk.Frame(btn_row)
        quick_frame.pack(side=tk.RIGHT, padx=8)
        ttk.Label(quick_frame, text="快捷原因：").pack(side=tk.LEFT)
        quick_reasons = ["漏盘", "调拨在途", "损耗", "录单错误", "串号"]
        for reason in quick_reasons:
            ttk.Button(quick_frame, text=reason, width=6,
                       command=lambda r=reason: self._insert_quick_reason(r)).pack(side=tk.LEFT, padx=2)

    def _import_stock(self):
        path = filedialog.askopenfilename(
            title="选择库存台账CSV文件",
            filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")]
        )
        if not path:
            return
        result = import_stock_csv(path)
        messagebox.showinfo("导入结果", result["message"])
        self._refresh_all()
        self._set_status(result["message"])

    def _import_stocktake(self):
        path = filedialog.askopenfilename(
            title="选择盘点扫码CSV文件",
            filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")]
        )
        if not path:
            return
        result = import_stocktake_csv(path)
        messagebox.showinfo("导入结果", result["message"])
        self._refresh_all()
        self._set_status(result["message"])

    def _import_transfer(self):
        path = filedialog.askopenfilename(
            title="选择调拨JSON文件",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        if not path:
            return
        result = import_transfer_json(path)
        messagebox.showinfo("导入结果", result["message"])
        self._refresh_all()
        self._set_status(result["message"])

    def _refresh_batches(self):
        self.batch_listbox.delete(0, tk.END)
        batches = get_all_batches()
        type_names = {"stock": "库存", "stocktake": "盘点", "transfer": "调拨"}
        for b in batches[:8]:
            name = type_names.get(b["batch_type"], b["batch_type"])
            self.batch_listbox.insert(tk.END, f"[{name}] {b['file_name']} ({b['record_count']}条)")
            self.batch_listbox.itemconfig(tk.END, fg="#4b5563")

    def _refresh_stores(self):
        for item in self.store_tree.get_children():
            self.store_tree.delete(item)

        stores = get_all_stores()
        summaries = {s["store_code"]: s for s in get_diff_summary()}

        for s in stores:
            code = s["store_code"]
            summary = summaries.get(code, {})
            self.store_tree.insert("", tk.END, iid=code, values=(
                code,
                summary.get("diff_sku_count", 0),
                summary.get("no_review_count", 0),
            ))

    def _on_store_select(self, event):
        sel = self.store_tree.selection()
        if sel:
            self.current_store = sel[0]
            self._load_diff_data()
        else:
            self.current_store = None
            self._clear_diff_table()

    def _refresh_all(self):
        self._refresh_batches()
        self._refresh_stores()
        if self.current_store:
            self._load_diff_data()

    def _load_diff_data(self):
        store = self.current_store
        if not store:
            return

        self.diff_data = compute_diff(store_code=store)
        self._apply_filters()
        self._set_status(f"门店 {store}：共 {len(self.diff_data)} 条SKU记录")

    def _apply_filters(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        search = self.search_var.get().strip().lower()
        show_count = 0

        for d in self.diff_data:
            if self.filter_vars["has_diff"].get() and not d["has_diff"]:
                continue
            if self.filter_vars["negative_stock"].get() and not d["negative_stock"]:
                continue
            if self.filter_vars["late_transfer"].get() and not d["late_transfer"]:
                continue
            if self.filter_vars["review_modified"].get() and not d["review_modified"]:
                continue
            if self.filter_vars["no_review"].get() and d.get("review_opinion"):
                continue
            if search and search not in d.get("sku_code", "").lower() and search not in d.get("sku_name", "").lower():
                continue

            tags = []
            diff = d.get("diff_qty") or 0
            if not d["has_diff"]:
                tags.append("no_diff")
            elif diff > 0:
                tags.append("diff_pos")
            else:
                tags.append("diff_neg")

            if d["negative_stock"]:
                tags.append("neg_stock")
            if d["late_transfer"]:
                tags.append("late_trans")
            if d["review_modified"]:
                tags.append("modified")

            self.tree.insert("", tk.END, iid=f"{d['store_code']}|{d['sku_code']}", values=(
                d.get("sku_code", ""),
                d.get("sku_name", ""),
                self._fmt_num(d.get("book_qty")),
                self._fmt_num(d.get("actual_qty")),
                self._fmt_num(d.get("transfer_in_qty")),
                self._fmt_num(d.get("transfer_out_qty")),
                self._fmt_num(d.get("net_transfer_qty")),
                self._fmt_num(d.get("diff_qty")),
                "是" if d["negative_stock"] else "否",
                "是" if d["late_transfer"] else "否",
                "是" if d.get("review_opinion") else "否",
                "是" if d["review_modified"] else "否",
                (d.get("review_opinion") or "")[:30],
            ), tags=tuple(tags))
            show_count += 1

        self._set_status(f"显示 {show_count} / {len(self.diff_data)} 条记录")

    def _fmt_num(self, val):
        if val is None:
            return "0"
        if isinstance(val, (int, float)) and val == int(val):
            return str(int(val))
        return f"{val:.2f}" if isinstance(val, float) else str(val)

    def _clear_diff_table(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

    def _on_row_select(self, event):
        sel = self.tree.selection()
        if not sel:
            return
        key = sel[0]
        store_code, sku_code = key.split("|", 1)

        item = None
        for d in self.diff_data:
            if d["store_code"] == store_code and d["sku_code"] == sku_code:
                item = d
                break

        if not item:
            return

        self.selected_row = item
        self.selected_info_var.set(
            f"门店：{item['store_code']}   SKU：{item['sku_code']} - {item.get('sku_name', '')}   "
            f"差异：{self._fmt_num(item.get('diff_qty'))}"
        )

        self.review_text.delete("1.0", tk.END)
        opinion = item.get("review_opinion") or ""
        self.review_text.insert("1.0", opinion)

        if item["review_modified"] and item.get("original_opinion"):
            self.original_opinion_var.set(f"原始意见：{item['original_opinion']}")
        else:
            self.original_opinion_var.set("")

    def _save_review_opinion(self):
        if not self.selected_row:
            messagebox.showwarning("提示", "请先选择一条记录")
            return

        opinion = self.review_text.get("1.0", tk.END).strip()
        store = self.selected_row["store_code"]
        sku = self.selected_row["sku_code"]

        result = save_review(store, sku, opinion)
        if result["success"]:
            if result.get("modified"):
                self._set_status(f"复核意见已更新，已标记为'被改写'")
            else:
                self._set_status("复核意见已保存")
            self._load_diff_data()

            for d in self.diff_data:
                if d["store_code"] == store and d["sku_code"] == sku:
                    d["review_opinion"] = opinion
                    if result.get("modified"):
                        d["is_modified"] = 1
                        d["review_modified"] = True
                    break

            key = f"{store}|{sku}"
            if self.tree.exists(key):
                self.tree.selection_set(key)
        else:
            messagebox.showerror("错误", "保存失败")

    def _insert_quick_reason(self, reason):
        self.review_text.insert(tk.INSERT, reason)

    def _export_report(self):
        if not self.current_store:
            messagebox.showwarning("提示", "请先选择门店")
            return
        path = filedialog.asksaveasfilename(
            title="保存门店差异报告",
            defaultextension=".csv",
            initialfile=f"门店{self.current_store}_盘点差异报告.csv",
            filetypes=[("CSV文件", "*.csv")]
        )
        if not path:
            return
        count = export_store_report(self.current_store, path)
        messagebox.showinfo("导出成功", f"已导出 {count} 条记录到：\n{path}")
        self._set_status(f"报告已导出：{path}")

    def _export_all_reports(self):
        stores = get_all_stores()
        if not stores:
            messagebox.showwarning("提示", "暂无门店数据")
            return

        out_dir = filedialog.askdirectory(title="选择报告输出目录")
        if not out_dir:
            return

        total = 0
        for s in stores:
            code = s["store_code"]
            path = os.path.join(out_dir, f"门店{code}_盘点差异报告.csv")
            cnt = export_store_report(code, path)
            total += cnt

        messagebox.showinfo("导出完成", f"共导出 {len(stores)} 个门店，合计 {total} 条记录。\n目录：{out_dir}")
        self._set_status(f"批量报告导出完成：{len(stores)} 个门店")

    def _set_status(self, msg):
        self.status_var.set(msg)


def main():
    init_db()
    root = tk.Tk()
    app = InventoryCheckApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
