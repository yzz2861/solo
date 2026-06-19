from flask import Flask
from app.routes.devices import devices_bp
from app.routes.borrowals import borrowals_bp
from app.routes.reports import reports_bp


def create_app():
    app = Flask(__name__)

    @app.route('/')
    def index():
        return {
            'code': 0,
            'message': '医疗器械外借复核API',
            'version': '1.0.0',
            'endpoints': {
                'devices': '/api/devices',
                'borrowals': '/api/borrowals',
                'reports': '/api/reports'
            }
        }

    app.register_blueprint(devices_bp, url_prefix='/api/devices')
    app.register_blueprint(borrowals_bp, url_prefix='/api/borrowals')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    return app
