import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.db import get_db

app = create_app()
app.config['TESTING'] = True
client = app.test_client()

passed = 0
failed = 0


def test(name, func):
    global passed, failed
    try:
        func()
        print(f'  ✓ {name}')
        passed += 1
    except AssertionError as e:
        print(f'  ✗ {name}: {e}')
        failed += 1
    except Exception as e:
        print(f'  ✗ {name} [异常]: {e}')
        failed += 1


def assert_eq(actual, expected, msg=''):
    assert actual == expected, f'{msg} expected={expected}, actual={actual}'


def assert_true(cond, msg=''):
    assert cond, msg


def setup_module():
    conn = get_db()
    conn.executescript("""
        DELETE FROM borrowal_accessories;
        DELETE FROM borrowals;
        DELETE FROM accessories;
        DELETE FROM devices;
        DELETE FROM sqlite_sequence WHERE name IN ('devices', 'accessories', 'borrowals', 'borrowal_accessories');
    """)
    conn.commit()
    conn.close()


print('=' * 60)
print('准备测试数据...')
setup_module()

print('\n【一、设备管理 API 测试】')

device_id_1 = None
device_id_2 = None
device_id_3 = None


def test_create_ecg_device():
    global device_id_1
    resp = client.post('/api/devices', json={
        'name': '便携心电图机',
        'model': 'ECG-2024',
        'serial_number': 'ECG-001',
        'category': '心电图设备',
        'location': '设备科A区',
        'accessories': [
            {'name': '心电导联线', 'quantity': 1},
            {'name': '充电器', 'quantity': 1}
        ]
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['name'], '便携心电图机')
    assert_eq(data['data']['status'], 'available')
    assert_eq(len(data['data']['accessories']), 2)
    device_id_1 = data['data']['id']


test('创建设备-便携心电图机', test_create_ecg_device)


def test_create_infusion_pump():
    global device_id_2
    resp = client.post('/api/devices', json={
        'name': '输液泵',
        'model': 'IP-300',
        'serial_number': 'IP-001',
        'category': '输液设备',
        'location': '设备科B区',
        'accessories': [
            {'name': '输液管支架', 'quantity': 1},
            {'name': '电源适配器', 'quantity': 1},
            {'name': '说明书', 'quantity': 1}
        ]
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    device_id_2 = data['data']['id']


test('创建设备-输液泵', test_create_infusion_pump)


def test_create_bp_monitor():
    global device_id_3
    resp = client.post('/api/devices', json={
        'name': '血压计',
        'model': 'BP-500',
        'serial_number': 'BP-001',
        'category': '生命体征设备',
        'location': '设备科C区',
        'accessories': [
            {'name': '袖带', 'quantity': 1},
            {'name': '充电线', 'quantity': 1}
        ]
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    device_id_3 = data['data']['id']


test('创建设备-血压计', test_create_bp_monitor)


def test_list_devices():
    resp = client.get('/api/devices')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(len(data['data']), 3)


test('查询设备列表', test_list_devices)


def test_get_device_detail():
    resp = client.get(f'/api/devices/{device_id_1}')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['name'], '便携心电图机')
    assert_eq(len(data['data']['accessories']), 2)


test('查询设备详情', test_get_device_detail)


def test_update_device():
    resp = client.put(f'/api/devices/{device_id_1}', json={
        'location': '设备科A区-新位置'
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['location'], '设备科A区-新位置')


test('更新设备信息', test_update_device)


def test_set_maintenance_status():
    resp = client.put(f'/api/devices/{device_id_3}', json={
        'status': 'maintenance'
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'maintenance')


test('设置设备维修状态', test_set_maintenance_status)


print(f'\n【二、外借登记 API 测试】')

borrowal_id_1 = None
borrowal_id_2 = None


def test_borrow_maintenance_device_should_fail():
    resp = client.post('/api/borrowals', json={
        'device_id': device_id_3,
        'department': '心内科',
        'responsible_person': '张护士',
        'expected_return_time': '2099-01-01 18:00:00'
    })
    data = resp.get_json()
    assert_eq(data['code'], 400)
    assert_true('维修' in data['message'], f'应提示维修中，实际：{data["message"]}')


test('维修中设备不能外借', test_borrow_maintenance_device_should_fail)


def test_borrow_device_success():
    global borrowal_id_1
    expected_time = (datetime.now() + timedelta(hours=4)).strftime('%Y-%m-%d %H:%M:%S')
    resp = client.post('/api/borrowals', json={
        'device_id': device_id_1,
        'department': '心内科',
        'responsible_person': '张护士',
        'expected_return_time': expected_time
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'borrowed')
    assert_eq(data['data']['department'], '心内科')
    assert_eq(len(data['data']['accessories']), 2)
    assert_eq(data['data']['device']['name'], '便携心电图机')
    borrowal_id_1 = data['data']['id']


test('外借登记成功', test_borrow_device_success)


def test_device_status_borrowed_after_borrowal():
    resp = client.get(f'/api/devices/{device_id_1}')
    data = resp.get_json()
    assert_eq(data['data']['status'], 'borrowed')


test('外借后设备状态变更为已借', test_device_status_borrowed_after_borrowal)


def test_double_borrow_should_fail():
    expected_time = (datetime.now() + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')
    resp = client.post('/api/borrowals', json={
        'device_id': device_id_1,
        'department': '呼吸科',
        'responsible_person': '李护士',
        'expected_return_time': expected_time
    })
    data = resp.get_json()
    assert_eq(data['code'], 400)
    assert_true('已外借' in data['message'] or '未归还' in data['message'],
                f'应提示已外借，实际：{data["message"]}')


test('未归还不能再次外借', test_double_borrow_should_fail)


def test_borrow_second_device():
    global borrowal_id_2
    expected_time = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S')
    resp = client.post('/api/borrowals', json={
        'device_id': device_id_2,
        'department': '消化科',
        'responsible_person': '王护士',
        'expected_return_time': expected_time
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    borrowal_id_2 = data['data']['id']


test('外借第二台设备', test_borrow_second_device)


def test_create_overdue_borrowal():
    resp = client.post('/api/devices', json={
        'name': '便携心电图机-备用',
        'serial_number': 'ECG-002',
        'category': '心电图设备',
        'accessories': [{'name': '心电导联线', 'quantity': 1}]
    })
    dev_id = resp.get_json()['data']['id']

    past_time = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d %H:%M:%S')
    expected_time = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')

    resp = client.post('/api/borrowals', json={
        'device_id': dev_id,
        'department': '神经内科',
        'responsible_person': '赵护士',
        'borrow_time': past_time,
        'expected_return_time': expected_time
    })
    assert_eq(resp.get_json()['code'], 0)


test('创建逾期借用记录（用于统计测试）', test_create_overdue_borrowal)


print(f'\n【三、归还与复核 API 测试】')


def test_return_with_cleaning_passed():
    resp = client.get(f'/api/borrowals/{borrowal_id_2}')
    acc_list = resp.get_json()['data']['accessories']

    return_acc = []
    for acc in acc_list:
        return_acc.append({
            'id': acc['id'],
            'return_quantity': acc['borrow_quantity'],
            'status': 'complete',
            'note': ''
        })

    resp = client.post(f'/api/borrowals/{borrowal_id_2}/return', json={
        'cleaning_check': 'passed',
        'accessories': return_acc
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'returned')


test('正常归还（清洁通过、配件齐全）', test_return_with_cleaning_passed)


def test_device_available_after_return():
    resp = client.get(f'/api/devices/{device_id_2}')
    assert_eq(resp.get_json()['data']['status'], 'available')


test('归还后设备状态恢复为可用', test_device_available_after_return)


def test_return_with_cleaning_failed():
    global borrowal_id_cleaning_failed

    resp = client.post('/api/borrowals', json={
        'device_id': device_id_2,
        'department': '儿科',
        'responsible_person': '陈护士',
        'expected_return_time': (datetime.now() + timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S')
    })
    borrowal_id = resp.get_json()['data']['id']

    acc_list = resp.get_json()['data']['accessories']
    return_acc = [{'id': a['id'], 'return_quantity': a['borrow_quantity'], 'status': 'complete'} for a in acc_list]

    resp = client.post(f'/api/borrowals/{borrowal_id}/return', json={
        'cleaning_check': 'failed',
        'accessories': return_acc
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'cleaning_failed')


test('归还时清洁检查未通过', test_return_with_cleaning_failed)


def test_return_with_damage_goes_to_review():
    resp = client.get(f'/api/borrowals/{borrowal_id_1}')
    acc_list = resp.get_json()['data']['accessories']

    return_acc = []
    for i, acc in enumerate(acc_list):
        if i == 0:
            return_acc.append({
                'id': acc['id'],
                'return_quantity': acc['borrow_quantity'],
                'status': 'complete',
                'note': ''
            })
        else:
            return_acc.append({
                'id': acc['id'],
                'return_quantity': 0,
                'status': 'missing',
                'note': '归还时发现缺失'
            })

    resp = client.post(f'/api/borrowals/{borrowal_id_1}/return', json={
        'cleaning_check': 'passed',
        'damage_note': '屏幕有划痕',
        'accessories': return_acc
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'reviewing_damage')
    assert_true('复核' in data.get('message', ''))


test('损坏归还进入复核流程（不直接关闭）', test_return_with_damage_goes_to_review)


def test_damage_review_passed():
    resp = client.post(f'/api/borrowals/{borrowal_id_1}/review', json={
        'review_result': 'passed',
        'review_note': '轻微划痕不影响使用'
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'returned')
    assert_eq(data['data']['device']['device_status'], 'available')


test('损坏复核通过，设备恢复可用', test_damage_review_passed)


def test_damage_review_maintenance():
    resp = client.post('/api/borrowals', json={
        'device_id': device_id_2,
        'department': '急诊',
        'responsible_person': '孙护士',
        'expected_return_time': (datetime.now() + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')
    })
    borrowal_id = resp.get_json()['data']['id']
    acc_list = resp.get_json()['data']['accessories']
    return_acc = [{'id': a['id'], 'return_quantity': a['borrow_quantity'], 'status': 'damaged', 'note': '外壳破损'} for a in acc_list]

    client.post(f'/api/borrowals/{borrowal_id}/return', json={
        'cleaning_check': 'passed',
        'damage_note': '无法正常开机',
        'accessories': return_acc
    })

    resp = client.post(f'/api/borrowals/{borrowal_id}/review', json={
        'review_result': 'maintenance',
        'review_note': '需送厂维修'
    })
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_eq(data['data']['status'], 'returned')
    assert_eq(data['data']['device']['device_status'], 'maintenance')


test('损坏复核不通过，设备转入维修', test_damage_review_maintenance)


print(f'\n【四、统计查询 API 测试】')


def test_department_borrowing_list():
    resp = client.get('/api/reports/department/心内科/borrowing')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(isinstance(data['data']['items'], list))
    print(f'    心内科在借设备: {data["data"]["total_borrowing"]} 台')


test('护士长查本科室在借清单', test_department_borrowing_list)


def test_overdue_list():
    resp = client.get('/api/reports/overdue')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(data['data']['total'] >= 1, f'至少应有1条逾期，实际：{data["data"]["total"]}')
    print(f'    逾期设备总数: {data["data"]["total"]} 台')


test('设备科查逾期设备清单', test_overdue_list)


def test_damage_list():
    resp = client.get('/api/reports/damage')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(data['data']['total'] >= 1, f'至少应有1条损坏记录')
    print(f'    损坏记录总数: {data["data"]["total"]} 条')


test('设备科查损坏记录', test_damage_list)


def test_cleaning_failed_list():
    resp = client.get('/api/reports/cleaning-failed')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(data['data']['total'] >= 1, f'至少应有1条清洁未通过记录')
    print(f'    清洁未通过记录: {data["data"]["total"]} 条')


test('设备科查清洁未通过记录', test_cleaning_failed_list)


def test_cleaning_failed_by_department():
    resp = client.get('/api/reports/cleaning-failed?department=儿科')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(data['data']['total'] >= 1)
    print(f'    儿科清洁未通过: {data["data"]["total"]} 条')


test('按科室追问清洁未通过记录', test_cleaning_failed_by_department)


def test_frequent_borrowal_ranking():
    resp = client.get('/api/reports/frequent-borrowal?top=5')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    assert_true(len(data['data']['items']) > 0)
    assert_true(data['data']['items'][0]['borrow_count'] >= data['data']['items'][-1]['borrow_count'])
    print(f'    高频借用Top3:')
    for i, item in enumerate(data['data']['items'][:3]):
        print(f'      {i+1}. {item["device_name"]} - {item["borrow_count"]}次')


test('高频借用设备排行（早会数据）', test_frequent_borrowal_ranking)


def test_morning_briefing():
    resp = client.get('/api/reports/morning-briefing?top=3')
    data = resp.get_json()
    assert_eq(data['code'], 0)
    summary = data['data']['summary']
    assert_true('total_borrowing' in summary)
    assert_true('overdue_count' in summary)
    assert_true('reviewing_damage_count' in summary)
    assert_true('cleaning_failed_count' in summary)
    assert_true(len(data['data']['top_devices']) <= 3)
    print(f'    早会汇总:')
    print(f'      在借总数: {summary["total_borrowing"]}')
    print(f'      逾期: {summary["overdue_count"]}')
    print(f'      待复核损坏: {summary["reviewing_damage_count"]}')
    print(f'      清洁未通过: {summary["cleaning_failed_count"]}')


test('设备科早会数据总览', test_morning_briefing)


print(f'\n{"=" * 60}')
print(f'测试完成: 通过 {passed} 项, 失败 {failed} 项')
print('=' * 60)

sys.exit(0 if failed == 0 else 1)
