from flask import Flask, request, jsonify

from models.rules import rule_version_store
from models.audit import audit_store
from services.abnormal_check import (
    process_abnormal_check,
    get_audit_by_trace,
    get_audit_by_biz
)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "success": True,
        "message": "楼栋水表异常API服务正常",
        "data": {
            "service": "building-water-meter-abnormal-api",
            "version": "1.0.0",
            "rule_versions": rule_version_store.list_versions()
        }
    })


@app.route('/api/abnormal/check', methods=['POST'])
def abnormal_check():
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "code": "EMPTY_BODY",
            "message": "请求体不能为空",
            "data": None
        }), 400

    result = process_abnormal_check(data)

    status_code = 200 if result["success"] else 400
    return jsonify(result), status_code


@app.route('/api/rules', methods=['GET'])
def list_rule_versions():
    versions = rule_version_store.list_versions()
    default = rule_version_store.get_default()
    return jsonify({
        "success": True,
        "code": "SUCCESS",
        "message": "查询成功",
        "data": {
            "default_version": default.version if default else None,
            "versions": versions
        }
    })


@app.route('/api/rules/<version>', methods=['GET'])
def get_rule_detail(version):
    rv = rule_version_store.get_version(version)
    if not rv:
        return jsonify({
            "success": False,
            "code": "NOT_FOUND",
            "message": f"规则版本 {version} 不存在",
            "data": None
        }), 404

    return jsonify({
        "success": True,
        "code": "SUCCESS",
        "message": "查询成功",
        "data": {
            "version": rv.version,
            "description": rv.description,
            "effective_from": rv.effective_from.isoformat(),
            "effective_to": rv.effective_to.isoformat() if rv.effective_to else None,
            "rules": rv.rules
        }
    })


@app.route('/api/audit/trace/<trace_id>', methods=['GET'])
def audit_by_trace(trace_id):
    result = get_audit_by_trace(trace_id)
    status_code = 200 if result["success"] else 404
    return jsonify(result), status_code


@app.route('/api/audit/biz/<biz_no>', methods=['GET'])
def audit_by_biz(biz_no):
    result = get_audit_by_biz(biz_no)
    status_code = 200 if result["success"] else 400
    return jsonify(result), status_code


@app.route('/api/audit/all', methods=['GET'])
def audit_all():
    limit = request.args.get('limit', 100, type=int)
    logs = audit_store.list_all(limit=limit)
    return jsonify({
        "success": True,
        "code": "SUCCESS",
        "message": "查询成功",
        "data": {
            "count": len(logs),
            "records": logs
        }
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "success": False,
        "code": "NOT_FOUND",
        "message": "接口不存在",
        "data": None
    }), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        "success": False,
        "code": "METHOD_NOT_ALLOWED",
        "message": "请求方法不允许",
        "data": None
    }), 405


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
