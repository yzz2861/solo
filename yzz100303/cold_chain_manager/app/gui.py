import sys
import os
from datetime import datetime
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTableWidget, QTableWidgetItem, QPushButton, QLabel, QLineEdit,
    QComboBox, QCheckBox, QFileDialog, QMessageBox, QTextEdit,
    QGroupBox, QFormLayout, QSplitter, QHeaderView, QStatusBar,
    QFrame
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QFont

from .store import DataStore
from .importer import import_inventory_csv, import_borrow_csv, import_return_json
from .exporter import export_report_csv, export_report_html
from .models import BoxStatus, ReviewResult, BoxState


STATUS_COLORS = {
    BoxStatus.REGISTERED: QColor("#909399"),
    BoxStatus.BORROWED: QColor("#409eff"),
    BoxStatus.RETURNED: QColor("#e6a23c"),
    BoxStatus.REVIEWED: QColor("#67c23a"),
    BoxStatus.ISOLATED: QColor("#f56c6c"),
}


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.store = DataStore()
        self.store.subscribe(self._on_data_changed)
        self.current_box_id = None
        self._init_ui()

    def _init_ui(self):
        self.setWindowTitle("冷链药箱交接管理系统")
        self.resize(1280, 800)

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(8)

        main_layout.addLayout(self._build_toolbar())

        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(self._build_filter_panel())
        splitter.addWidget(self._build_table_panel())
        splitter.addWidget(self._build_detail_panel())
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 3)
        splitter.setStretchFactor(2, 2)
        main_layout.addWidget(splitter, 1)

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self._update_status_bar()

    def _build_toolbar(self) -> QHBoxLayout:
        layout = QHBoxLayout()
        layout.setSpacing(6)

        title = QLabel("冷链药箱交接管理")
        title_font = QFont()
        title_font.setPointSize(16)
        title_font.setBold(True)
        title.setFont(title_font)
        layout.addWidget(title)

        layout.addStretch()

        btn_inv = QPushButton("导入台账 CSV")
        btn_inv.clicked.connect(self._on_import_inventory)
        layout.addWidget(btn_inv)

        btn_borrow = QPushButton("导入借出 CSV")
        btn_borrow.clicked.connect(self._on_import_borrow)
        layout.addWidget(btn_borrow)

        btn_return = QPushButton("导入回收温度 JSON")
        btn_return.clicked.connect(self._on_import_return)
        layout.addWidget(btn_return)

        line = QFrame()
        line.setFrameShape(QFrame.VLine)
        line.setFrameShadow(QFrame.Sunken)
        layout.addWidget(line)

        btn_export_csv = QPushButton("导出 CSV 报告")
        btn_export_csv.clicked.connect(self._on_export_csv)
        layout.addWidget(btn_export_csv)

        btn_export_html = QPushButton("导出 HTML 报告")
        btn_export_html.clicked.connect(self._on_export_html)
        layout.addWidget(btn_export_html)

        return layout

    def _build_filter_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)

        filter_group = QGroupBox("筛选条件")
        fl = QVBoxLayout(filter_group)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("搜索药箱/人员/批号...")
        self.search_input.textChanged.connect(self._refresh_table)
        fl.addWidget(QLabel("关键字"))
        fl.addWidget(self.search_input)

        self.status_combo = QComboBox()
        self.status_combo.addItem("全部状态", None)
        for s in BoxStatus:
            self.status_combo.addItem(s.value, s)
        self.status_combo.currentIndexChanged.connect(self._refresh_table)
        fl.addWidget(QLabel("状态"))
        fl.addWidget(self.status_combo)

        self.chk_overtemp = QCheckBox("仅显示超温")
        self.chk_overtemp.stateChanged.connect(self._refresh_table)
        fl.addWidget(self.chk_overtemp)

        self.chk_mismatch = QCheckBox("仅显示回收人不一致")
        self.chk_mismatch.stateChanged.connect(self._refresh_table)
        fl.addWidget(self.chk_mismatch)

        self.chk_batch = QCheckBox("仅显示批号缺失")
        self.chk_batch.stateChanged.connect(self._refresh_table)
        fl.addWidget(self.chk_batch)

        self.chk_issues = QCheckBox("仅显示有异常")
        self.chk_issues.stateChanged.connect(self._refresh_table)
        fl.addWidget(self.chk_issues)

        btn_reset = QPushButton("重置筛选")
        btn_reset.clicked.connect(self._reset_filters)
        fl.addWidget(btn_reset)

        layout.addWidget(filter_group)

        stats_group = QGroupBox("统计概览")
        self.stats_label = QLabel()
        self.stats_label.setWordWrap(True)
        stats_layout = QVBoxLayout(stats_group)
        stats_layout.addWidget(self.stats_label)
        layout.addWidget(stats_group)

        layout.addStretch()
        return panel

    def _build_table_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)

        header = QLabel("药箱列表")
        header_font = QFont()
        header_font.setBold(True)
        header.setFont(header_font)
        layout.addWidget(header)

        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels([
            "药箱编号", "状态", "借出人", "借出时间",
            "回收人", "最高温度", "异常标记"
        ])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        self.table.itemSelectionChanged.connect(self._on_row_selected)
        layout.addWidget(self.table, 1)

        return panel

    def _build_detail_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)

        header = QLabel("药箱详情")
        header_font = QFont()
        header_font.setBold(True)
        header.setFont(header_font)
        layout.addWidget(header)

        self.detail_label = QLabel("请选择一个药箱查看详情")
        self.detail_label.setWordWrap(True)
        self.detail_label.setStyleSheet("color: #999; padding: 20px;")
        self.detail_label.setAlignment(Qt.AlignTop | Qt.AlignHCenter)
        layout.addWidget(self.detail_label, 0, Qt.AlignTop)

        self.info_group = QGroupBox("基本信息")
        self.info_layout = QFormLayout(self.info_group)
        self.info_group.hide()
        layout.addWidget(self.info_group, 0)

        self.temp_group = QGroupBox("温度信息")
        self.temp_layout = QFormLayout(self.temp_group)
        self.temp_group.hide()
        layout.addWidget(self.temp_group, 0)

        review_group = QGroupBox("复核处理")
        rl = QVBoxLayout(review_group)

        rl.addWidget(QLabel("复核结果"))
        self.review_combo = QComboBox()
        for r in [ReviewResult.PENDING, ReviewResult.NORMAL, ReviewResult.ABNORMAL, ReviewResult.ISOLATED]:
            self.review_combo.addItem(r.value, r)
        rl.addWidget(self.review_combo)

        rl.addWidget(QLabel("复核人"))
        self.reviewer_input = QLineEdit()
        self.reviewer_input.setPlaceholderText("请输入复核人姓名")
        rl.addWidget(self.reviewer_input)

        rl.addWidget(QLabel("复核意见"))
        self.review_comment = QTextEdit()
        self.review_comment.setPlaceholderText("请输入复核意见...")
        self.review_comment.setMaximumHeight(100)
        rl.addWidget(self.review_comment)

        btn_review = QPushButton("保存复核")
        btn_review.clicked.connect(self._on_save_review)
        btn_review.setStyleSheet("background: #1a5490; color: white; padding: 8px; font-weight: bold;")
        rl.addWidget(btn_review)

        review_group.hide()
        self.review_group = review_group
        layout.addWidget(review_group, 0)

        layout.addStretch(1)

        return panel

    def _on_import_inventory(self):
        filepath, _ = QFileDialog.getOpenFileName(self, "选择药箱台账 CSV", "", "CSV 文件 (*.csv)")
        if not filepath:
            return
        try:
            added, skipped = import_inventory_csv(filepath, self.store)
            QMessageBox.information(self, "导入完成", f"导入完成\n新增: {added} 条\n跳过: {skipped} 条")
        except Exception as e:
            QMessageBox.critical(self, "导入失败", str(e))

    def _on_import_borrow(self):
        filepath, _ = QFileDialog.getOpenFileName(self, "选择借出记录 CSV", "", "CSV 文件 (*.csv)")
        if not filepath:
            return
        try:
            added, skipped = import_borrow_csv(filepath, self.store)
            QMessageBox.information(self, "导入完成", f"导入完成\n新增: {added} 条\n跳过: {skipped} 条")
        except Exception as e:
            QMessageBox.critical(self, "导入失败", str(e))

    def _on_import_return(self):
        filepath, _ = QFileDialog.getOpenFileName(self, "选择回收温度 JSON", "", "JSON 文件 (*.json)")
        if not filepath:
            return
        try:
            added, skipped = import_return_json(filepath, self.store)
            QMessageBox.information(self, "导入完成", f"导入完成\n新增: {added} 条\n跳过: {skipped} 条")
        except Exception as e:
            QMessageBox.critical(self, "导入失败", str(e))

    def _on_export_csv(self):
        filepath, _ = QFileDialog.getSaveFileName(self, "导出 CSV 报告", "交接报告.csv", "CSV 文件 (*.csv)")
        if not filepath:
            return
        boxes = self._current_filtered_boxes()
        try:
            export_report_csv(boxes, filepath)
            QMessageBox.information(self, "导出成功", f"已导出 {len(boxes)} 条记录到\n{filepath}")
        except Exception as e:
            QMessageBox.critical(self, "导出失败", str(e))

    def _on_export_html(self):
        filepath, _ = QFileDialog.getSaveFileName(self, "导出 HTML 报告", "交接报告.html", "HTML 文件 (*.html)")
        if not filepath:
            return
        boxes = self._current_filtered_boxes()
        try:
            export_report_html(boxes, filepath)
            QMessageBox.information(self, "导出成功", f"已导出 {len(boxes)} 条记录到\n{filepath}")
        except Exception as e:
            QMessageBox.critical(self, "导出失败", str(e))

    def _reset_filters(self):
        self.search_input.clear()
        self.status_combo.setCurrentIndex(0)
        self.chk_overtemp.setChecked(False)
        self.chk_mismatch.setChecked(False)
        self.chk_batch.setChecked(False)
        self.chk_issues.setChecked(False)

    def _current_filtered_boxes(self):
        return self.store.filter_boxes(
            status=self.status_combo.currentData(),
            overtemp_only=self.chk_overtemp.isChecked(),
            returner_mismatch_only=self.chk_mismatch.isChecked(),
            batch_missing_only=self.chk_batch.isChecked(),
            has_issues_only=self.chk_issues.isChecked(),
            keyword=self.search_input.text().strip(),
        )

    def _refresh_table(self):
        boxes = self._current_filtered_boxes()
        self.table.setRowCount(len(boxes))
        for row, box in enumerate(boxes):
            self._set_table_row(row, box)
        self._update_stats()

    def _set_table_row(self, row: int, box: BoxState):
        items = [
            box.box_id,
            box.status.value,
            box.borrow.borrower if box.borrow else "-",
            box.borrow.borrow_time.strftime("%Y-%m-%d %H:%M") if box.borrow else "-",
            box.return_record.returner if box.return_record else "-",
            f"{box.return_record.max_temp:.2f}℃" if (box.return_record and box.return_record.max_temp is not None) else "-",
        ]

        issues = []
        if box.has_overtemp:
            issues.append("超温")
        if box.returner_mismatch:
            issues.append("回收人不一致")
        if box.batch_missing:
            issues.append("批号缺失")
        issues_text = "、".join(issues) if issues else "无"
        items.append(issues_text)

        for col, val in enumerate(items):
            item = QTableWidgetItem(val)
            item.setFlags(item.flags() & ~Qt.ItemIsEditable)
            if col == 1:
                color = STATUS_COLORS.get(box.status, QColor("#333"))
                item.setForeground(color)
                f = item.font()
                f.setBold(True)
                item.setFont(f)
            if col == 5 and box.has_overtemp:
                item.setForeground(QColor("#f56c6c"))
                f = item.font()
                f.setBold(True)
                item.setFont(f)
            if box.has_issues:
                item.setBackground(QColor("#fffbe6"))
            self.table.setItem(row, col, item)

        self.table.item(row, 0).setData(Qt.UserRole, box.box_id)

    def _on_row_selected(self):
        items = self.table.selectedItems()
        if not items:
            return
        box_id = self.table.item(items[0].row(), 0).data(Qt.UserRole)
        self.current_box_id = box_id
        self._show_detail(box_id)

    def _show_detail(self, box_id: str):
        box = self.store.get_box(box_id)
        if not box:
            return

        self.detail_label.hide()
        self.info_group.show()
        self.temp_group.show()
        self.review_group.show()

        while self.info_layout.rowCount() > 0:
            self.info_layout.removeRow(0)
        while self.temp_layout.rowCount() > 0:
            self.temp_layout.removeRow(0)

        self.info_layout.addRow("药箱编号:", QLabel(box.box_id))
        self.info_layout.addRow("当前状态:", QLabel(box.status.value))
        if box.inventory:
            self.info_layout.addRow("类型:", QLabel(box.inventory.box_type or "-"))
            self.info_layout.addRow("存放位置:", QLabel(box.inventory.location or "-"))

        if box.borrow:
            self.info_layout.addRow("借出人:", QLabel(box.borrow.borrower))
            self.info_layout.addRow("借出时间:", QLabel(box.borrow.borrow_time.strftime("%Y-%m-%d %H:%M:%S")))
            self.info_layout.addRow("药品名称:", QLabel(box.borrow.drug_name or "-"))
            batch_label = QLabel(box.borrow.drug_batch or "（缺失）")
            if box.batch_missing:
                batch_label.setStyleSheet("color: #f56c6c; font-weight: bold;")
            self.info_layout.addRow("药品批号:", batch_label)
            self.info_layout.addRow("用途:", QLabel(box.borrow.purpose or "-"))

        if box.return_record:
            returner_label = QLabel(box.return_record.returner or "-")
            if box.returner_mismatch:
                returner_label.setStyleSheet("color: #e6a23c; font-weight: bold;")
            self.info_layout.addRow("回收人:", returner_label)
            self.info_layout.addRow("回收时间:", QLabel(box.return_record.return_time.strftime("%Y-%m-%d %H:%M:%S")))

        issues = []
        if box.has_overtemp:
            issues.append("超温")
        if box.returner_mismatch:
            issues.append("回收人不一致")
        if box.batch_missing:
            issues.append("批号缺失")
        issues_label = QLabel("、".join(issues) if issues else "无")
        if issues:
            issues_label.setStyleSheet("color: #f56c6c; font-weight: bold;")
        self.info_layout.addRow("异常标记:", issues_label)

        if box.return_record and box.return_record.temperature_points:
            max_t = box.return_record.max_temp
            min_t = box.return_record.min_temp
            avg_t = box.return_record.avg_temp
            max_label = QLabel(f"{max_t:.2f}℃")
            if box.has_overtemp:
                max_label.setStyleSheet("color: #f56c6c; font-weight: bold;")
            self.temp_layout.addRow("最高温度:", max_label)
            self.temp_layout.addRow("最低温度:", QLabel(f"{min_t:.2f}℃"))
            self.temp_layout.addRow("平均温度:", QLabel(f"{avg_t:.2f}℃"))
            self.temp_layout.addRow("采集点数:", QLabel(str(len(box.return_record.temperature_points))))
        else:
            self.temp_layout.addRow(QLabel("无温度数据"))

        idx = self.review_combo.findData(box.review_result)
        if idx >= 0:
            self.review_combo.setCurrentIndex(idx)
        self.review_comment.setPlainText(box.review_comment)
        if not self.reviewer_input.text():
            pass

    def _on_save_review(self):
        if not self.current_box_id:
            QMessageBox.warning(self, "提示", "请先选择一个药箱")
            return
        result = self.review_combo.currentData()
        comment = self.review_comment.toPlainText().strip()
        reviewer = self.reviewer_input.text().strip()
        if not reviewer:
            QMessageBox.warning(self, "提示", "请输入复核人姓名")
            return
        self.store.set_review(self.current_box_id, result, comment, reviewer)
        QMessageBox.information(self, "保存成功", f"药箱 {self.current_box_id} 复核已保存")

    def _on_data_changed(self):
        self._refresh_table()
        self._update_status_bar()
        if self.current_box_id:
            self._show_detail(self.current_box_id)

    def _update_stats(self):
        s = self.store.stats()
        text = (
            f"总数: {s['total']}\n"
            f"已借出: {s['borrowed']}\n"
            f"待复核: {s['returned']}\n"
            f"已复核: {s['reviewed']}\n"
            f"已隔离: {s['isolated']}\n"
            f"超温: {s['overtemp']}\n"
            f"回收人不一致: {s['returner_mismatch']}\n"
            f"批号缺失: {s['batch_missing']}\n"
            f"异常总计: {s['issues']}"
        )
        self.stats_label.setText(text)

    def _update_status_bar(self):
        s = self.store.stats()
        self.status_bar.showMessage(
            f"共 {s['total']} 个药箱 | 待复核: {s['returned']} | 异常: {s['issues']} | 已隔离: {s['isolated']}"
        )


def main():
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
