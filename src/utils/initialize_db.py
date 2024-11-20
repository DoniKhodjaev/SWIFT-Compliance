import sqlite3

# Path to the SQLite database file
DATABASE_PATH = 'swift_messages.db'

def initialize_db():
    # Connect to the database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Create the `swift_messages` table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS swift_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_reference TEXT,
        transaction_type TEXT,
        transaction_date TEXT,
        transaction_currency TEXT,
        transaction_amount TEXT,
        sender_account TEXT,
        sender_inn TEXT,
        sender_name TEXT,
        sender_address TEXT,
        sender_bank_code TEXT,
        receiver_account TEXT,
        receiver_inn TEXT,
        receiver_name TEXT,
        receiver_kpp TEXT,
        receiver_bank_code TEXT,
        receiver_bank_name TEXT,
        transaction_purpose TEXT,
        transaction_fees TEXT,
        company_info TEXT,
        receiver_info TEXT
    )
    ''')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    initialize_db()
    print("Database initialized successfully.")
