"""
CONSTRUCTION PAYMENT TRACKER - PYTHON CALCULATION MODULE
Business logic for construction contracts, acceptance milestones, remaining forecast,
overrun alerts, and cashflow deductions.
"""

from typing import Dict, List, Any, Optional

def calculate_boq_summary(boq_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tính tổng giá trị BOQ gốc, phát sinh và tổng duyệt."""
    orig_total = 0.0
    var_total = 0.0
    approved_total = 0.0

    for item in boq_items:
        orig_q = float(item.get("contractQty", 0.0) or 0.0)
        var_q = float(item.get("variationQty", 0.0) or 0.0)
        price = float(item.get("unitPrice", 0.0) or 0.0)

        orig_total += orig_q * price
        var_total += var_q * price
        approved_total += (orig_q + var_q) * price

    return {
        "originalAmount": orig_total,
        "variationAmount": var_total,
        "totalApprovedAmount": approved_total,
        "totalItems": len(boq_items)
    }

def get_cumulative_qty_before(milestones: List[Dict[str, Any]], target_ms_id: str, item_id: str) -> float:
    """Lấy lũy kế khối lượng đã nghiệm thu của 1 đầu việc trước đợt chỉ định."""
    target_idx = -1
    for idx, ms in enumerate(milestones):
        if ms.get("id") == target_ms_id:
            target_idx = idx
            break

    if target_idx <= 0:
        return 0.0

    total = 0.0
    for i in range(target_idx):
        qty = float(milestones[i].get("quantities", {}).get(item_id, 0.0) or 0.0)
        total += qty
    return total

def calculate_milestone_item(milestones: List[Dict[str, Any]], active_ms: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    """Tính toán chi tiết các cột khối lượng và thành tiền cho 1 công tác trong đợt."""
    orig_q = float(item.get("contractQty", 0.0) or 0.0)
    var_q = float(item.get("variationQty", 0.0) or 0.0)
    approved_q = orig_q + var_q
    price = float(item.get("unitPrice", 0.0) or 0.0)

    item_id = item.get("id", "")
    prev_q = get_cumulative_qty_before(milestones, active_ms.get("id", ""), item_id)
    this_q = float(active_ms.get("quantities", {}).get(item_id, 0.0) or 0.0)
    total_cum_q = prev_q + this_q
    rem_q = approved_q - total_cum_q
    rem_val = max(0.0, rem_q * price)

    this_amount = this_q * price
    cum_amount = total_cum_q * price
    pct = (total_cum_q / approved_q * 100.0) if approved_q > 0 else 0.0

    is_overrun = total_cum_q > (approved_q + 0.0001)
    overrun_q = (total_cum_q - approved_q) if is_overrun else 0.0
    overrun_amount = overrun_q * price

    return {
        "itemId": item_id,
        "code": item.get("code", ""),
        "name": item.get("name", ""),
        "unit": item.get("unit", ""),
        "origQty": orig_q,
        "varQty": var_q,
        "totalApprovedQty": approved_q,
        "unitPrice": price,
        "prevQty": prev_q,
        "thisPeriodQty": this_q,
        "totalCumulativeQty": total_cum_q,
        "remainingQty": rem_q,
        "remainingValue": rem_val,
        "thisPeriodAmount": this_amount,
        "totalCumulativeAmount": cum_amount,
        "completionPct": pct,
        "isOverrun": is_overrun,
        "overrunQty": overrun_q,
        "overrunAmount": overrun_amount,
        "isCompleted": abs(rem_q) < 0.0001
    }

def calculate_milestone_financials(project_info: Dict[str, Any], milestones: List[Dict[str, Any]], active_ms: Dict[str, Any], boq_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tính bảng tổng hợp khấu trừ tài chính cho đợt thanh toán."""
    gross = 0.0
    item_rows = []
    overrun_count = 0
    total_overrun_amount = 0.0

    for item in boq_items:
        row = calculate_milestone_item(milestones, active_ms, item)
        gross += row["thisPeriodAmount"]
        if row["isOverrun"]:
            overrun_count += 1
            total_overrun_amount += row["overrunAmount"]
        item_rows.append(row)

    # Thu hồi tạm ứng
    custom_adv = active_ms.get("customAdvanceDeduction")
    if custom_adv is not None and str(custom_adv).strip() != "":
        adv_ded = float(custom_adv)
    else:
        adv_rate = float(active_ms.get("advanceDeductionRate", project_info.get("advancePct", 20)) or 20)
        adv_ded = gross * (adv_rate / 100.0)

    # Giữ lại bảo hành
    ret_rate = float(active_ms.get("retentionRate", project_info.get("retentionPct", 5)) or 5)
    ret_ded = gross * (ret_rate / 100.0)

    # Giảm trừ khác
    other_ded = float(active_ms.get("otherDeductions", 0.0) or 0.0)

    # Thực nhận
    net_payment = gross - adv_ded - ret_ded - other_ded
    paid_amount = float(active_ms.get("paidAmount", 0.0) or 0.0)
    balance_due = net_payment - paid_amount

    return {
        "grossThisPeriod": gross,
        "advanceDeduction": adv_ded,
        "retentionDeduction": ret_ded,
        "otherDeductions": other_ded,
        "netPayment": net_payment,
        "paidAmount": paid_amount,
        "balanceDue": balance_due,
        "itemRows": item_rows,
        "overrunCount": overrun_count,
        "totalOverrunAmount": total_overrun_amount
    }
