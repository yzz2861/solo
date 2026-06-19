from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db import get_db, rows_to_dict_list

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/department/<department>/borrowing', methods=['GET'])
def department_borrowing(department):
    conn = get_db()
    borrowals = conn.execute("""
        SELECT b.*, d.name as device_name, d.model, d.serial_number, d.category
        FROM borrowals b
        JOIN devices d ON b.device_id = d.id
        WHERE b.department = ? AND b.status = 'borrowed'
        ORDER BY b.borrow_time DESC
    """, (department,)).fetchall()

    now = datetime.now()
    items = []
    overdue_count = 0
    for b in borrowals:
        b_dict = dict(b)
        expected = datetime.strptime(b['expected_return_time'], '%Y-%m-%d %H:%M:%S')
        is_overdue = expected < now
        b_dict['is_overdue'] = is_overdue
        if is_overdue:
            overdue_count += 1
        items.append(b_dict)

    conn.close()
    return jsonify({
        'code': 0,
        'data': {
            'department': department,
            'total_borrowing': len(items),
            'overdue_count': overdue_count,
            'items': items
        }
    })


@reports_bp.route('/overdue', methods=['GET'])
def overdue_list():
    department = request.args.get('department')

    sql = """
        SELECT b.*, d.name as device_name, d.model, d.serial_number, d.category
        FROM borrowals b
        JOIN devices d ON b.device_id = d.id
        WHERE b.status = 'borrowed'
          AND datetime(b.expected_return_time) < datetime('now', 'localtime')
    """
    params = []
    if department:
        sql += ' AND b.department = ?'
        params.append(department)
    sql += ' ORDER BY b.expected_return_time ASC'

    conn = get_db()
    rows = conn.execute(sql, params).fetchall()

    now = datetime.now()
    items = []
    for row in rows:
        r = dict(row)
        expected = datetime.strptime(row['expected_return_time'], '%Y-%m-%d %H:%M:%S')
        delta = now - expected
        r['overdue_hours'] = int(delta.total_seconds() // 3600)
        items.append(r)

    conn.close()
    return jsonify({'code': 0, 'data': {'total': len(items), 'items': items}})


@reports_bp.route('/damage', methods=['GET'])
def damage_list():
    department = request.args.get('department')
    status = request.args.get('status')

    sql = """
        SELECT b.*, d.name as device_name, d.model, d.serial_number, d.category
        FROM borrowals b
        JOIN devices d ON b.device_id = d.id
        WHERE b.damage_note IS NOT NULL AND b.damage_note != ''
    """
    params = []
    if department:
        sql += ' AND b.department = ?'
        params.append(department)
    if status:
        sql += ' AND b.status = ?'
        params.append(status)
    sql += ' ORDER BY b.actual_return_time DESC'

    conn = get_db()
    items = conn.execute(sql, params).fetchall()
    conn.close()

    return jsonify({'code': 0, 'data': {'total': len(items), 'items': rows_to_dict_list(items)}})


@reports_bp.route('/cleaning-failed', methods=['GET'])
def cleaning_failed():
    department = request.args.get('department')

    sql = """
        SELECT b.*, d.name as device_name, d.model, d.serial_number, d.category
        FROM borrowals b
        JOIN devices d ON b.device_id = d.id
        WHERE b.cleaning_check = 'failed'
    """
    params = []
    if department:
        sql += ' AND b.department = ?'
        params.append(department)
    sql += ' ORDER BY b.actual_return_time DESC'

    conn = get_db()
    items = conn.execute(sql, params).fetchall()
    conn.close()

    return jsonify({'code': 0, 'data': {'total': len(items), 'items': rows_to_dict_list(items)}})


@reports_bp.route('/frequent-borrowal', methods=['GET'])
def frequent_borrowal():
    top = request.args.get('top', 10, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    department = request.args.get('department')

    where_sql = 'WHERE 1=1'
    params = []
    if start_date:
        where_sql += ' AND b.borrow_time >= ?'
        params.append(start_date)
    if end_date:
        where_sql += ' AND b.borrow_time <= ?'
        params.append(end_date)
    if department:
        where_sql += ' AND b.department = ?'
        params.append(department)

    sql = f"""
        SELECT
            d.id as device_id,
            d.name as device_name,
            d.model,
            d.serial_number,
            d.category,
            COUNT(b.id) as borrow_count
        FROM devices d
        LEFT JOIN borrowals b ON d.id = b.device_id
        {where_sql}
        GROUP BY d.id
        ORDER BY borrow_count DESC
        LIMIT ?
    """
    params.append(top)

    conn = get_db()
    items = conn.execute(sql, params).fetchall()
    conn.close()

    return jsonify({'code': 0, 'data': {'total': len(items), 'items': rows_to_dict_list(items)}})


@reports_bp.route('/morning-briefing', methods=['GET'])
def morning_briefing():
    top = request.args.get('top', 5, type=int)

    conn = get_db()

    borrowing_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM borrowals WHERE status = 'borrowed'"
    ).fetchone()['cnt']

    overdue_count = conn.execute("""
        SELECT COUNT(*) as cnt FROM borrowals
        WHERE status = 'borrowed' AND datetime(expected_return_time) < datetime('now', 'localtime')
    """).fetchone()['cnt']

    reviewing_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM borrowals WHERE status = 'reviewing_damage'"
    ).fetchone()['cnt']

    cleaning_failed_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM borrowals WHERE status = 'cleaning_failed'"
    ).fetchone()['cnt']

    top_devices = conn.execute(f"""
        SELECT d.id, d.name, d.category, COUNT(b.id) as borrow_count
        FROM devices d
        LEFT JOIN borrowals b ON d.id = b.device_id
        GROUP BY d.id
        ORDER BY borrow_count DESC
        LIMIT ?
    """, (top,)).fetchall()

    department_stats = conn.execute("""
        SELECT department, COUNT(*) as borrowing_count
        FROM borrowals
        WHERE status = 'borrowed'
        GROUP BY department
        ORDER BY borrowing_count DESC
    """).fetchall()

    conn.close()

    return jsonify({
        'code': 0,
        'data': {
            'summary': {
                'total_borrowing': borrowing_count,
                'overdue_count': overdue_count,
                'reviewing_damage_count': reviewing_count,
                'cleaning_failed_count': cleaning_failed_count
            },
            'top_devices': rows_to_dict_list(top_devices),
            'department_borrowing': rows_to_dict_list(department_stats)
        }
    })


@reports_bp.route('/departments', methods=['GET'])
def list_departments():
    conn = get_db()
    rows = conn.execute("""
        SELECT DISTINCT department FROM borrowals ORDER BY department
    """).fetchall()
    conn.close()

    departments = [r['department'] for r in rows if r['department']]
    return jsonify({'code': 0, 'data': departments})
