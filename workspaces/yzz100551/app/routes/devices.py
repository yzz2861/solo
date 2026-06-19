from flask import Blueprint, request, jsonify
from app.db import get_db, row_to_dict, rows_to_dict_list

devices_bp = Blueprint('devices', __name__)

VALID_STATUSES = ['available', 'borrowed', 'maintenance', 'pending_review']


@devices_bp.route('', methods=['GET'])
def list_devices():
    category = request.args.get('category')
    status = request.args.get('status')
    keyword = request.args.get('keyword')

    sql = 'SELECT * FROM devices WHERE 1=1'
    params = []

    if category:
        sql += ' AND category = ?'
        params.append(category)
    if status:
        sql += ' AND status = ?'
        params.append(status)
    if keyword:
        sql += ' AND (name LIKE ? OR serial_number LIKE ? OR model LIKE ?)'
        kw = f'%{keyword}%'
        params.extend([kw, kw, kw])
    sql += ' ORDER BY created_at DESC'

    conn = get_db()
    devices = conn.execute(sql, params).fetchall()
    conn.close()

    result = []
    for device in devices:
        dev_dict = dict(device)
        conn = get_db()
        accessories = conn.execute('SELECT * FROM accessories WHERE device_id = ?', (device['id'],)).fetchall()
        conn.close()
        dev_dict['accessories'] = rows_to_dict_list(accessories)
        result.append(dev_dict)

    return jsonify({'code': 0, 'data': result})


@devices_bp.route('/<int:device_id>', methods=['GET'])
def get_device(device_id):
    conn = get_db()
    device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    if not device:
        conn.close()
        return jsonify({'code': 404, 'message': '设备不存在'})

    accessories = conn.execute('SELECT * FROM accessories WHERE device_id = ?', (device_id,)).fetchall()
    conn.close()

    result = dict(device)
    result['accessories'] = rows_to_dict_list(accessories)
    return jsonify({'code': 0, 'data': result})


@devices_bp.route('', methods=['POST'])
def create_device():
    data = request.get_json()
    name = data.get('name')
    model = data.get('model')
    serial_number = data.get('serial_number')
    category = data.get('category')
    location = data.get('location')
    accessories = data.get('accessories', [])

    if not name or not category:
        return jsonify({'code': 400, 'message': '设备名称和分类必填'})

    conn = get_db()
    try:
        cursor = conn.execute(
            'INSERT INTO devices (name, model, serial_number, category, location) VALUES (?, ?, ?, ?, ?)',
            (name, model, serial_number, category, location)
        )
        device_id = cursor.lastrowid

        for acc in accessories:
            if acc.get('name'):
                conn.execute(
                    'INSERT INTO accessories (device_id, name, quantity) VALUES (?, ?, ?)',
                    (device_id, acc['name'], acc.get('quantity', 1))
                )
        conn.commit()

        device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
        acc_list = conn.execute('SELECT * FROM accessories WHERE device_id = ?', (device_id,)).fetchall()
        conn.close()

        result = dict(device)
        result['accessories'] = rows_to_dict_list(acc_list)
        return jsonify({'code': 0, 'data': result})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'code': 500, 'message': f'创建设备失败: {str(e)}'})


@devices_bp.route('/<int:device_id>', methods=['PUT'])
def update_device(device_id):
    data = request.get_json()
    name = data.get('name')
    model = data.get('model')
    serial_number = data.get('serial_number')
    category = data.get('category')
    location = data.get('location')
    status = data.get('status')

    conn = get_db()
    device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    if not device:
        conn.close()
        return jsonify({'code': 404, 'message': '设备不存在'})

    if status and status not in VALID_STATUSES:
        conn.close()
        return jsonify({'code': 400, 'message': '无效的设备状态'})

    if status == 'borrowed':
        conn.close()
        return jsonify({'code': 400, 'message': '不能直接设置为已借状态，请通过外借接口'})

    updates = []
    params = []
    if name:
        updates.append('name = ?')
        params.append(name)
    if model is not None:
        updates.append('model = ?')
        params.append(model)
    if serial_number is not None:
        updates.append('serial_number = ?')
        params.append(serial_number)
    if category:
        updates.append('category = ?')
        params.append(category)
    if location is not None:
        updates.append('location = ?')
        params.append(location)
    if status:
        updates.append('status = ?')
        params.append(status)

    if updates:
        params.append(device_id)
        conn.execute(f"UPDATE devices SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    updated = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    acc_list = conn.execute('SELECT * FROM accessories WHERE device_id = ?', (device_id,)).fetchall()
    conn.close()

    result = dict(updated)
    result['accessories'] = rows_to_dict_list(acc_list)
    return jsonify({'code': 0, 'data': result})


@devices_bp.route('/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    conn = get_db()
    device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    if not device:
        conn.close()
        return jsonify({'code': 404, 'message': '设备不存在'})
    if device['status'] == 'borrowed':
        conn.close()
        return jsonify({'code': 400, 'message': '设备外借中，无法删除'})

    conn.execute('DELETE FROM devices WHERE id = ?', (device_id,))
    conn.commit()
    conn.close()

    return jsonify({'code': 0, 'message': '删除成功'})


@devices_bp.route('/<int:device_id>/accessories', methods=['POST'])
def add_accessory(device_id):
    data = request.get_json()
    name = data.get('name')
    quantity = data.get('quantity', 1)

    if not name:
        return jsonify({'code': 400, 'message': '配件名称必填'})

    conn = get_db()
    device = conn.execute('SELECT * FROM devices WHERE id = ?', (device_id,)).fetchone()
    if not device:
        conn.close()
        return jsonify({'code': 404, 'message': '设备不存在'})

    cursor = conn.execute(
        'INSERT INTO accessories (device_id, name, quantity) VALUES (?, ?, ?)',
        (device_id, name, quantity)
    )
    conn.commit()

    acc = conn.execute('SELECT * FROM accessories WHERE id = ?', (cursor.lastrowid,)).fetchone()
    conn.close()

    return jsonify({'code': 0, 'data': dict(acc)})
