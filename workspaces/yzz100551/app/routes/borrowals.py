from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db import get_db, rows_to_dict_list

borrowals_bp = Blueprint('borrowals', __name__)


def _enrich_borrowal(borrowal_dict, conn):
    device = conn.execute(
        'SELECT id, name, model, serial_number, category FROM devices WHERE id = ?',
        (borrowal_dict['device_id'],)
    ).fetchone()
    borrowal_dict['device'] = dict(device) if device else None

    accessories = conn.execute("""
        SELECT ba.*, a.name as accessory_name
        FROM borrowal_accessories ba
        JOIN accessories a ON ba.accessory_id = a.id
        WHERE ba.borrowal_id = ?
    """, (borrowal_dict['id'],)).fetchall()
    borrowal_dict['accessories'] = rows_to_dict_list(accessories)
    return borrowal_dict


@borrowals_bp.route('', methods=['GET'])
def list_borrowals():
    department = request.args.get('department')
    status = request.args.get('status')
    device_id = request.args.get('device_id')

    sql = 'SELECT * FROM borrowals WHERE 1=1'
    params = []

    if department:
        sql += ' AND department = ?'
        params.append(department)
    if status:
        sql += ' AND status = ?'
        params.append(status)
    if device_id:
        sql += ' AND device_id = ?'
        params.append(device_id)
    sql += ' ORDER BY borrow_time DESC'

    conn = get_db()
    borrowals = conn.execute(sql, params).fetchall()

    result = []
    for b in borrowals:
        b_dict = dict(b)
        _enrich_borrowal(b_dict, conn)
        result.append(b_dict)

    conn.close()
    return jsonify({'code': 0, 'data': result})


@borrowals_bp.route('/<int:borrowal_id>', methods=['GET'])
def get_borrowal(borrowal_id):
    conn = get_db()
    borrowal = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
    if not borrowal:
        conn.close()
        return jsonify({'code': 404, 'message': '记录不存在'})

    result = dict(borrowal)
    _enrich_borrowal(result, conn)
    conn.close()
    return jsonify({'code': 0, 'data': result})


@borrowals_bp.route('', methods=['POST'])
def create_borrowal():
    data = request.get_json()
    device_id = data.get('device_id')
    department = data.get('department')
    responsible_person = data.get('responsible_person')
    expected_return_time = data.get('expected_return_time')
    borrow_time = data.get('borrow_time')

    if not all([device_id, department, responsible_person, expected_return_time]):
        return jsonify({'code': 400, 'message': '设备、科室、责任人、预计归还时间必填'})

    conn = get_db()
    device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    if not device:
        conn.close()
        return jsonify({'code': 404, 'message': '设备不存在'})

    if device['status'] == 'maintenance':
        conn.close()
        return jsonify({'code': 400, 'message': '设备维修中，不能外借'})

    if device['status'] == 'pending_review':
        conn.close()
        return jsonify({'code': 400, 'message': '设备损坏待复核，不能外借'})

    if device['status'] == 'borrowed':
        conn.close()
        return jsonify({'code': 400, 'message': '设备已外借，未归还前不能再次外借'})

    try:
        if borrow_time:
            cursor = conn.execute("""
                INSERT INTO borrowals (device_id, department, responsible_person, borrow_time, expected_return_time)
                VALUES (?, ?, ?, ?, ?)
            """, (device_id, department, responsible_person, borrow_time, expected_return_time))
        else:
            cursor = conn.execute("""
                INSERT INTO borrowals (device_id, department, responsible_person, expected_return_time)
                VALUES (?, ?, ?, ?)
            """, (device_id, department, responsible_person, expected_return_time))

        borrowal_id = cursor.lastrowid

        conn.execute("UPDATE devices SET status = 'borrowed' WHERE id = ?", (device_id,))

        accessories = conn.execute('SELECT * FROM accessories WHERE device_id = ?', (device_id,)).fetchall()
        for acc in accessories:
            conn.execute("""
                INSERT INTO borrowal_accessories (borrowal_id, accessory_id, borrow_quantity)
                VALUES (?, ?, ?)
            """, (borrowal_id, acc['id'], acc['quantity']))

        conn.commit()

        borrowal = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
        result = dict(borrowal)
        _enrich_borrowal(result, conn)
        conn.close()

        return jsonify({'code': 0, 'data': result})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'code': 500, 'message': f'外借登记失败: {str(e)}'})


@borrowals_bp.route('/<int:borrowal_id>/return', methods=['POST'])
def return_borrowal(borrowal_id):
    data = request.get_json()
    cleaning_check = data.get('cleaning_check')
    accessories = data.get('accessories', [])
    damage_note = data.get('damage_note')
    actual_return_time = data.get('actual_return_time')

    conn = get_db()
    borrowal = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
    if not borrowal:
        conn.close()
        return jsonify({'code': 404, 'message': '记录不存在'})

    if borrowal['status'] != 'borrowed':
        conn.close()
        return jsonify({'code': 400, 'message': '当前状态不是外借中，无法归还'})

    if cleaning_check and cleaning_check not in ['passed', 'failed']:
        conn.close()
        return jsonify({'code': 400, 'message': '清洁检查状态无效'})

    has_damage = bool(damage_note and damage_note.strip())
    has_missing_acc = any(a.get('status') in ('missing', 'damaged') for a in accessories)

    if has_damage or has_missing_acc:
        new_status = 'reviewing_damage'
    elif cleaning_check == 'failed':
        new_status = 'cleaning_failed'
    else:
        new_status = 'returned'

    return_time = actual_return_time
    if not return_time:
        return_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    try:
        conn.execute("""
            UPDATE borrowals SET
                actual_return_time = ?,
                cleaning_check = ?,
                damage_note = ?,
                status = ?
            WHERE id = ?
        """, (return_time, cleaning_check, damage_note, new_status, borrowal_id))

        for acc in accessories:
            if acc.get('id'):
                conn.execute("""
                    UPDATE borrowal_accessories
                    SET return_quantity = ?, status = ?, note = ?
                    WHERE id = ?
                """, (acc.get('return_quantity', 0), acc.get('status'), acc.get('note'), acc['id']))

        if new_status == 'returned':
            device_status = 'available'
        elif new_status == 'reviewing_damage':
            device_status = 'pending_review'
        else:
            device_status = 'available'
        conn.execute("UPDATE devices SET status = ? WHERE id = ?", (device_status, borrowal['device_id']))

        conn.commit()

        result_row = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
        result = dict(result_row)

        device_row = conn.execute("""
            SELECT id, name, model, serial_number, category, status as device_status
            FROM devices WHERE id = ?
        """, (borrowal['device_id'],)).fetchone()
        result['device'] = dict(device_row)

        acc_list = conn.execute("""
            SELECT ba.*, a.name as accessory_name
            FROM borrowal_accessories ba
            JOIN accessories a ON ba.accessory_id = a.id
            WHERE ba.borrowal_id = ?
        """, (borrowal_id,)).fetchall()
        result['accessories'] = rows_to_dict_list(acc_list)
        conn.close()

        if new_status == 'reviewing_damage':
            msg = '归还已登记，发现损坏/配件缺失，进入复核流程'
        elif new_status == 'cleaning_failed':
            msg = '归还已登记，清洁检查未通过'
        else:
            msg = '归还成功'

        return jsonify({'code': 0, 'data': result, 'message': msg})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'code': 500, 'message': f'归还操作失败: {str(e)}'})


@borrowals_bp.route('/<int:borrowal_id>/review', methods=['POST'])
def review_borrowal(borrowal_id):
    data = request.get_json()
    review_result = data.get('review_result')
    review_note = data.get('review_note')

    if not review_result or review_result not in ['passed', 'maintenance']:
        return jsonify({'code': 400, 'message': '复核结果必填（passed 或 maintenance）'})

    conn = get_db()
    borrowal = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
    if not borrowal:
        conn.close()
        return jsonify({'code': 404, 'message': '记录不存在'})

    if borrowal['status'] != 'reviewing_damage':
        conn.close()
        return jsonify({'code': 400, 'message': '当前状态不是待复核，无法执行复核'})

    try:
        new_borrowal_status = 'returned'
        device_status = 'available' if review_result == 'passed' else 'maintenance'

        conn.execute("""
            UPDATE borrowals SET status = ?, review_note = ? WHERE id = ?
        """, (new_borrowal_status, review_note, borrowal_id))

        conn.execute("UPDATE devices SET status = ? WHERE id = ?", (device_status, borrowal['device_id']))

        conn.commit()

        result_row = conn.execute('SELECT * FROM borrowals WHERE id = ?', (borrowal_id,)).fetchone()
        result = dict(result_row)

        device_row = conn.execute("""
            SELECT id, name, model, serial_number, category, status as device_status
            FROM devices WHERE id = ?
        """, (borrowal['device_id'],)).fetchone()
        result['device'] = dict(device_row)
        conn.close()

        msg = '复核通过，设备可正常使用' if review_result == 'passed' else '复核完成，设备转入维修'
        return jsonify({'code': 0, 'data': result, 'message': msg})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'code': 500, 'message': f'复核失败: {str(e)}'})
