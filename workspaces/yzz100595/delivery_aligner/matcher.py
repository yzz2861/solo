from typing import List, Dict, Optional, Tuple
from datetime import date
from collections import defaultdict

from .models import (
    PurchaseOrder,
    DeliveryPromise,
    ArrivalRecord,
    MatchedOrder,
    OrderStatus,
)
from .date_utils import (
    days_between,
    is_overdue,
    format_date,
    describe_date_relative,
)


def _build_index(items: List, key_attr: str = "order_key") -> Dict[str, List]:
    idx = defaultdict(list)
    for item in items:
        key = getattr(item, key_attr, None)
        if key:
            idx[key].append(item)
    parent_key = getattr(items[0], "order_no", None) if items else None
    if parent_key is not None:
        for item in items:
            order_no = getattr(item, "order_no", None)
            if order_no:
                idx[order_no].append(item)
    return dict(idx)


def _match_by_material_and_supplier(
    order: PurchaseOrder,
    promises_pool: List[DeliveryPromise],
    arrivals_pool: List[ArrivalRecord],
) -> Tuple[List[DeliveryPromise], List[ArrivalRecord]]:
    matched_promises = []
    matched_arrivals = []

    for p in promises_pool:
        if p.order_no == order.order_no:
            if p.order_line and order.order_line and p.order_line != order.order_line:
                continue
            if order.material_code and p.material_code and p.material_code != order.material_code:
                continue
            matched_promises.append(p)

    for a in arrivals_pool:
        if a.order_no == order.order_no:
            if a.order_line and order.order_line and a.order_line != order.order_line:
                continue
            if order.material_code and a.material_code and a.material_code != order.material_code:
                continue
            matched_arrivals.append(a)

    return matched_promises, matched_arrivals


def _calculate_delivered_qty(arrivals: List[ArrivalRecord]) -> float:
    return sum(a.arrival_quantity for a in arrivals)


def _get_latest_promise(promises: List[DeliveryPromise]) -> Optional[DeliveryPromise]:
    if not promises:
        return None
    dated = [p for p in promises if p.promise_date]
    if not dated:
        return promises[0]
    dated.sort(key=lambda p: p.promise_date or date.min)
    return dated[-1]


def _get_latest_arrival(arrivals: List[ArrivalRecord]) -> Optional[ArrivalRecord]:
    if not arrivals:
        return None
    dated = [a for a in arrivals if a.arrival_date]
    if not dated:
        return arrivals[0]
    dated.sort(key=lambda a: a.arrival_date or date.min)
    return dated[-1]


def _handle_partial_batches(
    order: PurchaseOrder,
    promises: List[DeliveryPromise],
    arrivals: List[ArrivalRecord],
    notes: List[str],
) -> Tuple[List[DeliveryPromise], List[ArrivalRecord], bool]:
    has_partial = False
    partial_promises = [p for p in promises if p.is_partial or p.batch_no or (p.promise_quantity and p.promise_quantity < order.quantity)]
    partial_arrivals = [a for a in arrivals if a.batch_no]

    if partial_promises:
        has_partial = True
        total_promise_qty = sum(
            (p.promise_quantity or 0) for p in partial_promises
        )
        batch_info = []
        for i, p in enumerate(partial_promises, 1):
            qty_info = f"{p.promise_quantity or '?'}"
            date_info = format_date(p.promise_date) if p.promise_date else "?"
            batch_info.append(f"第{i}批:{qty_info}@{date_info}")
        notes.append(f"分批承诺: {'; '.join(batch_info)}")
        if total_promise_qty and total_promise_qty < order.quantity:
            notes.append(f"承诺总量({total_promise_qty})少于订单数量({order.quantity})")

    if partial_arrivals and len(partial_arrivals) > 1:
        has_partial = True
        arrival_batches = defaultdict(float)
        for a in partial_arrivals:
            key = a.batch_no or "未标记"
            arrival_batches[key] += a.arrival_quantity
        batch_str = "; ".join(f"{k}:{v}" for k, v in arrival_batches.items())
        notes.append(f"分批到货: {batch_str}")

    return promises, arrivals, has_partial


def _handle_split_order(
    order: PurchaseOrder,
    all_orders: List[PurchaseOrder],
    notes: List[str],
) -> None:
    if order.is_split:
        notes.append(f"订单拆分: {order.order_no}-{order.order_line}")
        parent_siblings = [
            o for o in all_orders
            if o.order_no == order.order_no and o.order_key != order.order_key
        ]
        if parent_siblings:
            sibling_info = ", ".join(
                f"{o.order_line}({o.quantity}{o.unit})"
                for o in parent_siblings
            )
            notes.append(f"同主单其它行: {sibling_info}")


def _determine_status(
    order: PurchaseOrder,
    delivered_qty: float,
    promises: List[DeliveryPromise],
    latest_promise: Optional[DeliveryPromise],
    today: date,
) -> Tuple[OrderStatus, int]:
    full_qty = order.quantity

    if delivered_qty >= full_qty and full_qty > 0:
        return OrderStatus.FULLY_DELIVERED, 0

    has_promise = len(promises) > 0 and latest_promise is not None and latest_promise.promise_date is not None

    if delivered_qty > 0:
        plan_overdue, plan_days = is_overdue(order.plan_date, today) if order.plan_date else (False, 0)
        if has_promise:
            promise_date = latest_promise.promise_date
            overdue, days = is_overdue(promise_date, today)
            if overdue:
                return OrderStatus.DELAYED, days
            if plan_overdue:
                return OrderStatus.DELAYED, plan_days
        elif plan_overdue:
            return OrderStatus.DELAYED, plan_days
        return OrderStatus.PARTIALLY_DELIVERED, 0

    if has_promise:
        promise_date = latest_promise.promise_date
        overdue, days = is_overdue(promise_date, today)
        if overdue:
            return OrderStatus.DELAYED, days
        plan_overdue, plan_days = is_overdue(order.plan_date, today) if order.plan_date else (False, 0)
        if plan_overdue:
            return OrderStatus.DELAYED, plan_days
        return OrderStatus.PROMISED_PENDING, 0

    if order.plan_date:
        overdue, days = is_overdue(order.plan_date, today)
        if overdue:
            return OrderStatus.DELAYED, days
    return OrderStatus.NO_PROMISE, 0


def match_orders(
    purchase_orders: List[PurchaseOrder],
    promises: List[DeliveryPromise],
    arrivals: List[ArrivalRecord],
    today: Optional[date] = None,
) -> List[MatchedOrder]:
    today = today or date.today()

    promises_by_order = _build_index(promises)
    arrivals_by_order = _build_index(arrivals)

    matched: List[MatchedOrder] = []

    for order in purchase_orders:
        order_promises: List[DeliveryPromise] = []
        order_arrivals: List[ArrivalRecord] = []

        exact_key = order.order_key
        if exact_key in promises_by_order:
            order_promises.extend(promises_by_order[exact_key])
        if exact_key in arrivals_by_order:
            order_arrivals.extend(arrivals_by_order[exact_key])

        if order.order_no in promises_by_order:
            for p in promises_by_order[order.order_no]:
                if p not in order_promises:
                    order_promises.append(p)
        if order.order_no in arrivals_by_order:
            for a in arrivals_by_order[order.order_no]:
                if a not in order_arrivals:
                    order_arrivals.append(a)

        order_promises, order_arrivals = _match_by_material_and_supplier(
            order, order_promises, order_arrivals
        )

        notes: List[str] = []

        if order.supplier_full:
            supplier_notes = []
            non_matching_supplier_promises = [
                p for p in order_promises
                if p.supplier_full and order.supplier_full
                and p.supplier_full != order.supplier_full
            ]
            non_matching_supplier_arrivals = [
                a for a in order_arrivals
                if a.supplier_full and order.supplier_full
                and a.supplier_full != order.supplier_full
            ]
            if non_matching_supplier_promises:
                supplier_notes.append(f"承诺来自不同供应商: {', '.join(set(p.supplier_short or p.supplier_full for p in non_matching_supplier_promises))}")
            if non_matching_supplier_arrivals:
                supplier_notes.append(f"到货来自不同供应商: {', '.join(set(a.supplier_full for a in non_matching_supplier_arrivals))}")
            notes.extend(supplier_notes)

        order_promises, order_arrivals, is_partial = _handle_partial_batches(
            order, order_promises, order_arrivals, notes
        )

        _handle_split_order(order, purchase_orders, notes)

        delivered_qty = _calculate_delivered_qty(order_arrivals)
        remaining_qty = max(0.0, order.quantity - delivered_qty)

        latest_promise = _get_latest_promise(order_promises)
        latest_arrival = _get_latest_arrival(order_arrivals)

        has_promise = len(order_promises) > 0 and latest_promise is not None and latest_promise.promise_date is not None
        has_arrival = len(order_arrivals) > 0

        status, delay_days = _determine_status(
            order, delivered_qty, order_promises, latest_promise, today
        )

        if order.plan_date and has_promise and latest_promise and latest_promise.promise_date:
            plan_promise_diff = days_between(order.plan_date, latest_promise.promise_date)
            if plan_promise_diff > 0:
                notes.append(f"供应商承诺晚于计划交期{plan_promise_diff}天")
            elif plan_promise_diff < 0:
                notes.append(f"供应商承诺早于计划交期{abs(plan_promise_diff)}天")

        if latest_arrival and latest_arrival.arrival_date and latest_promise and latest_promise.promise_date:
            arr_promise_diff = days_between(latest_promise.promise_date, latest_arrival.arrival_date)
            if arr_promise_diff > 0:
                notes.append(f"实际到货比承诺晚{arr_promise_diff}天")

        mo = MatchedOrder(
            purchase_order=order,
            promises=order_promises,
            arrivals=order_arrivals,
            status=status,
            delivered_quantity=delivered_qty,
            remaining_quantity=remaining_qty,
            latest_promise_date=latest_promise.promise_date if latest_promise else None,
            latest_arrival_date=latest_arrival.arrival_date if latest_arrival else None,
            delay_days=delay_days,
            has_promise=has_promise,
            has_arrival=has_arrival,
            is_partial_batch=is_partial,
            notes=notes,
        )
        matched.append(mo)

    matched.sort(key=lambda m: (
        _status_sort_priority(m.status),
        -(m.delay_days),
        -(m.remaining_quantity),
    ))

    return matched


def _status_sort_priority(status: OrderStatus) -> int:
    priority = {
        OrderStatus.DELAYED: 0,
        OrderStatus.NO_PROMISE: 1,
        OrderStatus.PARTIALLY_DELIVERED: 2,
        OrderStatus.PROMISED_PENDING: 3,
        OrderStatus.PENDING: 4,
        OrderStatus.FULLY_DELIVERED: 5,
    }
    return priority.get(status, 99)


def group_by_status(matched: List[MatchedOrder]) -> Dict[OrderStatus, List[MatchedOrder]]:
    groups: Dict[OrderStatus, List[MatchedOrder]] = defaultdict(list)
    for m in matched:
        groups[m.status].append(m)
    return dict(groups)


def group_by_supplier(matched: List[MatchedOrder]) -> Dict[str, List[MatchedOrder]]:
    groups: Dict[str, List[MatchedOrder]] = defaultdict(list)
    for m in matched:
        key = m.purchase_order.supplier_short or m.purchase_order.supplier_full or "未知供应商"
        groups[key].append(m)
    return dict(groups)


def filter_by_status(
    matched: List[MatchedOrder],
    statuses: List[OrderStatus],
) -> List[MatchedOrder]:
    return [m for m in matched if m.status in statuses]


def get_promised_not_arrived(matched: List[MatchedOrder]) -> List[MatchedOrder]:
    return [
        m for m in matched
        if m.has_promise and not m.has_arrival
    ]


def get_no_promise_orders(matched: List[MatchedOrder]) -> List[MatchedOrder]:
    return [
        m for m in matched
        if not m.has_promise
        and m.status != OrderStatus.FULLY_DELIVERED
    ]


def get_delayed_orders(matched: List[MatchedOrder]) -> List[MatchedOrder]:
    return [m for m in matched if m.status == OrderStatus.DELAYED]


def summarize(matched: List[MatchedOrder]) -> Dict:
    total = len(matched)
    by_status = group_by_status(matched)
    delayed = get_delayed_orders(matched)
    no_promise = get_no_promise_orders(matched)
    promised_pending = get_promised_not_arrived(matched)

    total_qty = sum(m.purchase_order.quantity for m in matched)
    delivered_qty = sum(m.delivered_quantity for m in matched)
    remaining_qty = sum(m.remaining_quantity for m in matched)

    total_delay_days = sum(m.delay_days for m in delayed)
    avg_delay = round(total_delay_days / len(delayed), 1) if delayed else 0

    return {
        "total_orders": total,
        "by_status": {k.value: len(v) for k, v in by_status.items()},
        "delayed_count": len(delayed),
        "no_promise_count": len(no_promise),
        "promised_pending_count": len(promised_pending),
        "total_quantity": total_qty,
        "delivered_quantity": delivered_qty,
        "remaining_quantity": remaining_qty,
        "overall_delivery_rate": round(delivered_qty / total_qty * 100, 1) if total_qty > 0 else 0,
        "total_delay_days": total_delay_days,
        "avg_delay_days": avg_delay,
        "by_supplier_count": {k: len(v) for k, v in group_by_supplier(matched).items()},
    }
