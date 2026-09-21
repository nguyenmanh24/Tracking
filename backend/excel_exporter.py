"""
CONSTRUCTION PAYMENT TRACKER - PYTHON EXCEL EXPORTER
Generates multi-sheet Excel workbooks with professional formatting, colors, and headers.
"""

import os
from typing import Dict, Any, List
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .calculator import (
    calculate_boq_summary,
    calculate_milestone_financials,
    calculate_milestone_item
)

def export_project_excel(project: Dict[str, Any], output_path: str, active_ms_id: str = None) -> str:
    """Xuất file Excel báo cáo dự án với 3 Sheet định dạng đẹp."""
    wb = openpyxl.Workbook()
    
    info = project.get("info", {})
    boq = project.get("boqItems", [])
    milestones = project.get("milestones", [])
    
    # Styles
    title_font = Font(name="Arial", size=14, bold=True, color="1E3A8A")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    sub_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    bold_font = Font(name="Arial", size=10, bold=True)
    regular_font = Font(name="Arial", size=10)
    num_fmt_vnd = '#,##0'
    num_fmt_qty = '#,##0.000'

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # --- SHEET 1: TỔNG HỢP DÒNG TIỀN ---
    ws_summary = wb.active
    ws_summary.title = "Tổng Hợp Dòng Tiền"
    ws_summary.views.sheetView[0].showGridLines = True

    ws_summary.append(["BÁO CÁO TỔNG HỢP THANH TOÁN & DÒNG TIỀN CÔNG TRÌNH"])
    ws_summary["A1"].font = title_font
    ws_summary.append(["Dự án:", info.get("name", "")])
    ws_summary.append(["Gói thầu:", info.get("package", "")])
    ws_summary.append(["Chủ đầu tư:", info.get("investor", "")])
    ws_summary.append(["Nhà thầu:", info.get("contractor", "")])
    ws_summary.append(["Hợp đồng số:", info.get("contractNo", "")])
    ws_summary.append([])

    # Table Header
    headers_ms = ["STT", "Mã Đợt", "Tên Đợt Thanh Toán", "Từ Ngày", "Đến Ngày", "Trạng Thái", "Giá Trị Nghiệm Thu (đ)", "Thu Hồi Tạm Ứng (đ)", "Giữ Lại BH (đ)", "Giảm Trừ Khác (đ)", "Đề Nghị TT (đ)", "Đã Giải Ngân (đ)", "CĐT Còn Nợ (đ)"]
    ws_summary.append(headers_ms)
    header_row_idx = ws_summary.max_row

    for col_idx in range(1, len(headers_ms) + 1):
        cell = ws_summary.cell(row=header_row_idx, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, ms in enumerate(milestones):
        fin = calculate_milestone_financials(info, milestones, ms, boq)
        status_map = {"draft": "Dự thảo", "inspected": "Đã nghiệm thu", "approved": "Đã ký duyệt", "paid": "Đã thanh toán"}
        row_vals = [
            idx + 1,
            ms.get("code", f"DOT-0{idx+1}"),
            ms.get("name", ""),
            ms.get("startDate", ""),
            ms.get("endDate", ""),
            status_map.get(ms.get("status"), ms.get("status")),
            fin["grossThisPeriod"],
            fin["advanceDeduction"],
            fin["retentionDeduction"],
            fin["otherDeductions"],
            fin["netPayment"],
            fin["paidAmount"],
            fin["balanceDue"]
        ]
        ws_summary.append(row_vals)
        cur_row = ws_summary.max_row
        for c in range(1, len(row_vals) + 1):
            cell = ws_summary.cell(row=cur_row, column=c)
            cell.font = regular_font
            cell.border = thin_border
            if c in [7, 8, 9, 10, 11, 12, 13]:
                cell.number_format = num_fmt_vnd
                cell.alignment = Alignment(horizontal="right")
            elif c in [1, 2, 4, 5, 6]:
                cell.alignment = Alignment(horizontal="center")

    # Auto column widths
    for col in ws_summary.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_summary.column_dimensions[col_letter].width = max(max_len + 3, 12)

    wb.save(output_path)
    return output_path
