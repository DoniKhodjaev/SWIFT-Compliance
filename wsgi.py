from flask import Flask
from flask_cors import CORS
from src.utils.swiftParser import swift_app, initialize_db
from src.utils.sdnLookup import sdn_app

# Создаем основное приложение
main_app = Flask(__name__)
CORS(main_app)

# Инициализация базы данных
with main_app.app_context():
    initialize_db()

# Регистрируем модули
main_app.register_blueprint(swift_app, url_prefix="/api/swift")
main_app.register_blueprint(sdn_app, url_prefix="/api/sdn")

if __name__ == "__main__":
    main_app.run(host="0.0.0.0", port=3000, debug=True)
