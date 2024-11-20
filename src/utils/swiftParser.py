import sqlite3
from flask import Blueprint, request, jsonify, Flask
from flask_cors import CORS
import os
import re
import json
import time
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
from transliterate import translit
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

app = Flask(__name__)
CORS(app)

# Paths
SWIFT_FOLDER_PATH = './public/swift'
PARSED_DATA_PATH = './public/data'
DATABASE_PATH = 'swift_messages.db'

# Ensure directories exist
os.makedirs(SWIFT_FOLDER_PATH, exist_ok=True)
os.makedirs(PARSED_DATA_PATH, exist_ok=True)

# Parsed files data dictionary
parsed_files = {}

# Initialize Database
def initialize_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
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


ENTITY_LABELS = [
    # Russian (Cyrillic and Latin)
    "ООО", "OOO", "Общество с ограниченной ответственностью", "Obshchestvo s ogranichennoy otvetstvennostyu",
    "ЗАО", "ZAO", "Закрытое акционерное общество", "Zakrytoe aktsionernoe obshchestvo", "МЕЖДУНАРОДНАЯ КОМПАНИЯ ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО",
    "ОАО", "OAO", "Открытое акционерное общество", "Otkrytoe aktsionernoe obshchestvo", "MKPAO",
    "АО", "AO", "Акционерное общество", "Aktsionernoe obshchestvo", "AKTsIONERNAJa KOMPANIJa",
    "ПАО", "PAO", "Публичное акционерное общество", "Publichnoe aktsionernoe obshchestvo",
    "ИП", "IP", "Индивидуальный предприниматель", "Individual’nyy predprinimatel'", "MEZhDUNARODNAYa KOMPANIYa PUBLIChNOE AKTsIONERNOE OBShchESTVO",
    "ГУП", "GUP", "Государственное унитарное предприятие", "Gosudarstvennoe unitarnoe predpriyatie",
    "ЧП", "ChP", "Частное предприятие", "Chastnoe predpriyatie", "OBSchESTVO S OGRANIChENNOJ OTVETSTVENNOST\'Ju",
    
    # English
    "LLC", "Limited Liability Company", "Inc", "Incorporated", "Corp", "Corporation",
    "Ltd", "Limited", "Plc", "Public Limited Company", "LLP", "Limited Liability Partnership",
    "Sole Prop.", "Sole Proprietorship", "NGO", "Non-Governmental Organization",
    "NPO", "Non-Profit Organization", "Co.", "Company", "SA", "Société Anonyme",
    "GmbH", "Gesellschaft mit beschränkter Haftung", "AG", "Aktiengesellschaft", 
    
    # Uzbek (Cyrillic and Latin)
    "МЧЖ", "MChJ", "Масъулияти чекланган жамият", "Masʼuliyati cheklangan jamiyat", "MAS`ULIYATI CHEKLANGAN JAMIYAT",
    "АЖ", "AJ", "Акциядорлик жамияти", "Aktsiyadorlik jamiyati",
    "ЙТТ", "YTT", "Якка тартибдаги тадбиркор", "Yakka tartibdagi tadbirkor",
    "ДУК", "DUK", "Давлат унитар корхонаси", "Davlat unitar korxonasi",
    "ХК", "XK", "Хусусий корхона", "Xususiy korxona",
    "ФМШЖ", "FMShJ", "Фуқароларнинг масъулияти чекланган жамияти", "Fuqarolarning masʼuliyati cheklangan jamiyati",
    "КФХ", "KFX", "Крестьянское фермерское хозяйство", "Dehqon fermer xoʻjaligi",
    "ТШЖ", "TShJ", "Тадбиркорлик шерикчилиги жамияти", "Tadbirkorlik sherikchiligi jamiyati",
    "КХ", "KH", "Хусусий корхона", "Xususiy korxona"
]

ENTITY_ABBREVIATIONS = {
    # Russian (Cyrillic and Latin)
    "Общество с ограниченной ответственностью": "ООО",
    "Obshchestvo s ogranichennoy otvetstvennostyu": "OOO",
    "МЕЖДУНАРОДНАЯ КОМПАНИЯ ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО": "MKPAO",
    "Закрытое акционерное общество": "ЗАО",
    "Zakrytoe aktsionernoe obshchestvo": "ZAO",
    "Открытое акционерное общество": "ОАО",
    "Otkrytoe aktsionernoe obshchestvo": "OAO",
    "Акционерное общество": "АО",
    "Aktsionernoe obshchestvo": "AO",
    "AKTsIONERNAJa KOMPANIJa": "АО",
    "Публичное акционерное общество": "ПАО",
    "Publichnoe aktsionernoe obshchestvo": "PAO",
    "Индивидуальный предприниматель": "ИП",
    "Individual’nyy predprinimatel'": "IP",
    "Некоммерческая организация": "НКО",
    "Nekommercheskaya organizatsiya": "NKO",
    "Государственное унитарное предприятие": "ГУП",
    "Gosudarstvennoe unitarnoe predpriyatie": "GUP",
    "Частное предприятие": "ЧП",
    "Chastnoe predpriyatie": "ChP",
    "OBSchESTVO S OGRANIChENNOJ OTVETSTVENNOST'Ju": "ООО",

    # English
    "Limited Liability Company": "LLC",
    "Incorporated": "Inc",
    "Corporation": "Corp",
    "Limited": "Ltd",
    "Public Limited Company": "Plc",
    "Limited Liability Partnership": "LLP",
    "Sole Proprietorship": "Sole Prop.",
    "Non-Governmental Organization": "NGO",
    "Non-Profit Organization": "NPO",
    "Company": "Co.",
    "Société Anonyme": "SA",
    "Gesellschaft mit beschränkter Haftung": "GmbH",
    "Aktiengesellschaft": "AG",

    # Uzbek (Cyrillic and Latin)
    "Масъулияти чекланган жамият": "МЧЖ",
    "Masʼuliyati cheklangan jamiyat": "MChJ",
    "MAS`ULIYATI CHEKLANGAN JAMIYAT": "MChJ",
    "Акциядорлик жамияти": "АЖ",
    "Aktsiyadorlik jamiyati": "AJ",
    "Якка тартибдаги тадбиркор": "ЙТТ",
    "Yakka tartibdagi tadbirkor": "YTT",
    "Давлат унитар корхонаси": "ДУК",
    "Davlat unitar korxonasi": "DUK",
    "Хусусий корхона": "ХК",
    "Xususiy korxona": "XK",
    "Фуқароларнинг масъулияти чекланган жамияти": "ФМШЖ",
    "Fuqarolarning masʼuliyati cheklangan jamiyati": "FMShJ",
    "Крестьянское фермерское хозяйство": "КФХ",
    "Dehqon fermer xoʻjaligi": "KFX",
    "Тадбиркорлик шерикчилиги жамияти": "ТШЖ",
    "Tadbirkorlik sherikchiligi jamiyati": "TShJ",
}


MAX_DEPTH = 5  # Maximum depth for recursive company checks
RATE_LIMIT_DELAY = 1  # Delay between requests in seconds

def transliterate_text(text):
    if text is None:
        return None
    try:
        if any(ord(char) in range(0x0400, 0x04FF) for char in text):
            return translit(text, 'ru', reversed=True)
        return text
    except Exception as e:
        print(f"Error in transliteration: {e}")
        return text
    
def clean_company_name(name):
    if not name:
        return None
    
    # Replace full names with abbreviations
    for full_name, abbreviation in ENTITY_ABBREVIATIONS.items():
        name = re.sub(re.escape(full_name), abbreviation, name, flags=re.IGNORECASE)
    
    # Remove additional labels (if needed)
    pattern = r'\b(?:' + '|'.join(ENTITY_LABELS) + r')\b'
    name = re.sub(pattern, '', name, flags=re.IGNORECASE).strip()
    
    # Clean up unnecessary characters
    name = re.sub(r'["\'/]', '', name)
    name = re.sub(r'\s+', ' ', name)
    return name

def apply_abbreviations(name):
    """Apply abbreviations to entity names based on ENTITY_ABBREVIATIONS."""
    if not name:
        return name
    for full_name, abbreviation in ENTITY_ABBREVIATIONS.items():
        name = re.sub(re.escape(full_name), abbreviation, name, flags=re.IGNORECASE)
    return name.strip()

def clean_and_transliterate_founder_name(name):
    cleaned_name = clean_company_name(name)
    latin_name = transliterate_text(cleaned_name)
    return {"cyrillic": cleaned_name, "latin": latin_name}

def is_company_name(name):
    if not name:
        return False
    name_upper = name.upper()
    pattern = r'\b(?:' + '|'.join(re.escape(label).upper() for label in ENTITY_LABELS) + r')\b'
    return bool(re.search(pattern, name_upper))

def extract_transaction_reference(message):
    match = re.search(r":20:([^\n]+)", message)
    return match.group(1).strip() if match else None

def extract_transaction_type(message):
    match = re.search(r":23B:([^\n]+)", message)
    return match.group(1).strip() if match else None

def extract_transaction_date_and_currency(message):
    match = re.search(r":32A:(\d{6})([A-Z]{3})([\d,]+)", message)
    if match:
        raw_date, currency, amount = match.groups()
        try:
            formatted_date = datetime.strptime(raw_date, "%y%m%d").strftime("%Y-%m-%d")
            return formatted_date, currency, amount.replace(',', '.')
        except ValueError as e:
            print(f"Date parsing error: {e}")
            return None, None, None
    return None, None, None

def extract_sender_details(message):
    patterns = [
        r":50K:\s*/(\d+)\s*\n(?:INN(\d+)\s*\n)?([^\n]+)(?:\n([\s\S]+?)(?=:\d{2}[A-Z]:))?",
        r":50K:\s*/(\d+)\s*\n([^\n]+)(?:\n([\s\S]+?)(?=:\d{2}[A-Z]:))?",
        r":50K:(?:\s*/)?(\d+)\s*\n([^\n]+)(?:\n([\s\S]+?)(?=:\d{2}[A-Z]:))?"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, message)
        if match:
            groups = match.groups()
            account = groups[0].strip() if groups[0] else None
            
            if len(groups) == 4:
                inn = groups[1].strip() if groups[1] else None
                name = clean_company_name(groups[2])
                address = transliterate_text(groups[3].strip().replace("\n", ", ")) if groups[3] else None
            else:
                inn = None
                name = clean_company_name(groups[1])
                address = transliterate_text(groups[2].strip().replace("\n", ", ")) if groups[2] else None
            
            if name:
                return account, inn, name, address
    
    return None, None, None, None

def extract_sender_bank_code(message):
    match = re.search(r":52A:([^\n]+)|:53B:([^\n]+)", message)
    return (match.group(1) or match.group(2)).strip() if match else None

def extract_receiver_details(message):
    account_pattern = r":59:\s*/(\d+)"
    account_match = re.search(account_pattern, message)
    account = account_match.group(1).strip() if account_match else None

    details_pattern = r":59:\s*/\d+\s*\n(?:INN(\d+)(?:\.KPP(\d+))?\s*\n)?([^\n]+)"
    details_match = re.search(details_pattern, message)
    
    if details_match:
        inn = details_match.group(1).strip() if details_match.group(1) else None
        kpp = details_match.group(2).strip() if details_match.group(2) else None
        name = clean_company_name(details_match.group(3))
        return account, name, inn, kpp
    
    return account, None, None, None

def extract_receiver_bank_details(message):
    patterns = [
        r":57D://([^\n]+)\n([^\n]+)",
        r":57A:([^\n]+)\n([^\n]+)",
        r":57:/([^\n]+)\n([^\n]+)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, message)
        if match:
            code_info = match.group(1).strip()
            bank_name = transliterate_text(match.group(2).strip()) if match.group(2) else None
            
            if '.' in code_info:
                bank_code, transit_account = code_info.split('.', 1)
            else:
                bank_code, transit_account = code_info, None
                
            return bank_code.strip(), transit_account.strip() if transit_account else None, bank_name
    
    return None, None, None

def extract_transaction_purpose(message):
    match = re.search(r":70:([\s\S]+?)(?=:71|$)", message, re.DOTALL)
    if match:
        purpose = match.group(1).strip()
        return transliterate_text(purpose)
    return None

def extract_transaction_fees(message):
    match = re.search(r":71A:([^\n]+)", message)
    return match.group(1).strip() if match else None

def search_orginfo(company_name):
    if not company_name:
        print("Company name is empty.")
        return None

    encoded_name = quote(company_name)
    search_url = f"https://orginfo.uz/en/search/organizations/?q={encoded_name}&sort=active"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        time.sleep(RATE_LIMIT_DELAY)
        response = requests.get(search_url, headers=headers, timeout=15)
        response.raise_for_status()  # Check if the request was successful
        print(f"Searching orginfo for {company_name}: Status {response.status_code}")

        soup = BeautifulSoup(response.text, "html.parser")
        
        # Log response text to verify if structure matches expectations
        print(soup.prettify())  # Print the HTML structure for debugging

        for link in soup.find_all("a", href=True):
            if company_name.lower() in link.text.lower():
                print(f"Found match for {company_name} with URL: {link['href']}")
                return urljoin("https://orginfo.uz", link['href'])
        print(f"No match found for {company_name} on orginfo.")
    except requests.RequestException as e:
        print(f"Error searching for company: {e}")
    return None

def fetch_company_details_orginfo(org_url):
    if not org_url:
        print("Org URL is empty.")
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        time.sleep(RATE_LIMIT_DELAY)
        response = requests.get(org_url, headers=headers, timeout=15)
        response.raise_for_status()
        print(f"Fetching company details from {org_url}")

        soup = BeautifulSoup(response.text, "html.parser")
        company_details = {}

        # Extract and abbreviate company name
        company_name_tag = soup.find("h1", class_="h1-seo")
        if company_name_tag:
            company_details["name"] = apply_abbreviations(company_name_tag.text.strip())
            print(f"Company Name (abbreviated): {company_details['name']}")

        # Extract TIN
        tin_tag = soup.find("span", id="organizationTinValue")
        if tin_tag:
            company_details["TIN"] = tin_tag.text.strip()
            print(f"TIN: {company_details['TIN']}")

        # Extract and abbreviate CEO information
        ceo_section = soup.find("h5", string="Management information")
        if ceo_section:
            ceo_name_tag = ceo_section.find_next("a")
            if ceo_name_tag:
                company_details["CEO"] = apply_abbreviations(ceo_name_tag.text.strip())
                print(f"CEO (abbreviated): {company_details['CEO']}")

        # Extract address
        address_section = soup.find("h5", string="Contact information")
        if address_section:
            address_row = address_section.find_next("div", class_="row").find_all("div", class_="row")[-1]
            address_tag = address_row.find("span")
            if address_tag:
                address_parts = address_row.find_all("span")
                if len(address_parts) > 1:
                    company_details["address"] = address_parts[1].text.strip()
                    print(f"Address: {company_details['address']}")

        # Extract and abbreviate founders
        founders = []
        founder_section = soup.find("h5", string="Founders")
        if founder_section:
            founder_rows = founder_section.find_next_sibling("div").find_all("div", class_="row")
            for row in founder_rows:
                founder_name_tag = row.find("a")
                if founder_name_tag:
                    founder_name = apply_abbreviations(founder_name_tag.text.strip())
                    founder = {
                        "owner": founder_name,
                        "isCompany": is_company_name(founder_name)
                    }
                    founders.append(founder)
                    print(f"Found Founder (abbreviated): {founder_name}")

        if founders:
            company_details["Founders"] = founders

        return company_details

    except requests.RequestException as e:
        print(f"Error fetching company details from orginfo: {e}")
    return None

def get_company_details(inn, depth=0, processed_inns=None):
    """Fetch company details and recursively explore nested company founders."""
    if not inn:
        return None

    if processed_inns is None:
        processed_inns = set()

    # Avoid infinite recursion and circular ownership
    if depth >= MAX_DEPTH or inn in processed_inns:
        return {
            "error": "Maximum depth reached or circular ownership detected",
            "inn": inn,
            "processed_inns": list(processed_inns),
        }

    processed_inns.add(inn)
    time.sleep(RATE_LIMIT_DELAY)

    if inn.isdigit():
        url = f"https://egrul.itsoft.ru/{inn}"
        headers = {"User-Agent": "Mozilla/5.0"}

        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            company_info = {
                'inn': inn,
                'name': None,
                'registrationDate': None,
                'address': None,
                'CEO': None,
                'Founders': [],
            }

            # Extract and abbreviate company name
            name_tag = soup.find('h1', id='short_name')
            if name_tag:
                company_info['name'] = apply_abbreviations(name_tag.text.strip())
                print(f"Company Name (abbreviated): {company_info['name']}")

            # Extract address
            address_div = soup.find('div', id='address')
            if address_div:
                company_info['address'] = address_div.text.strip()

            # Extract registration date
            reg_date_div = soup.find('div', string=re.compile(r'Дата регистрации'))
            if reg_date_div:
                date_match = re.search(r'\d{2}\.\d{2}\.\d{4}', reg_date_div.text)
                if date_match:
                    company_info['registrationDate'] = date_match.group()

            # Extract and abbreviate CEO information
            ceo_div = soup.find('div', id='chief')
            if ceo_div:
                ceo_name_tag = ceo_div.find('a')
                if ceo_name_tag:
                    company_info['CEO'] = apply_abbreviations(ceo_name_tag.text.strip())
                    print(f"CEO (abbreviated): {company_info['CEO']}")

            # Extract and abbreviate founders
            founders_div = soup.find('div', id='СвУчредит')
            if founders_div:
                for founder_link in founders_div.find_all('a'):
                    founder_name = apply_abbreviations(founder_link.text.strip())
                    founder_inn = founder_link.get('href').strip('/').split('/')[-1] if founder_link.get('href') else None

                    is_founder_company = is_company_name(founder_name)
                    founder = {
                        "owner": founder_name,
                        "isCompany": is_founder_company,
                    }

                    # Recursively fetch and abbreviate company details for founders
                    if is_founder_company and founder_inn and founder_inn.isdigit():
                        founder['companyDetails'] = get_company_details(founder_inn, depth + 1, processed_inns.copy())

                    company_info['Founders'].append(founder)
                    print(f"Founder (abbreviated): {founder_name}")

            return company_info if company_info['name'] or company_info['Founders'] else None

        except Exception as e:
            print(f"Error retrieving company data for INN {inn}: {e}")
            return None
    else:
        # Handle foreign companies or non-numeric INNs
        return {
            'inn': inn,
            'registrationDate': None,
            'address': None,
            'CEO': None,
            'Founders': [],
            'isForeign': True,
            'jurisdiction': extract_jurisdiction(inn)
        }

def extract_jurisdiction(company_name):
    """Extract jurisdiction from company name or identifier."""
    jurisdictions = {
        'S.P.A.': 'Italy',
        'SA': 'Multiple',
        'AG': 'Germany/Switzerland',
        'GmbH': 'Germany',
        'Ltd': 'UK',
        'Inc': 'USA',
        'LLC': 'USA',
        'B.V.': 'Netherlands',
        'N.V.': 'Netherlands/Belgium'
    }
    
    company_name_upper = company_name.upper()
    for suffix, country in jurisdictions.items():
        if suffix.upper() in company_name_upper:
            return country
            
    return 'Unknown'

def save_to_database(parsed_data):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if a record with the same transaction_reference already exists
        cursor.execute("SELECT 1 FROM swift_messages WHERE transaction_reference = ?", (parsed_data.get("transaction_reference"),))
        if cursor.fetchone() is not None:
            print(f"Transaction with reference {parsed_data.get('transaction_reference')} already exists in the database.")
            return  # Exit the function without saving duplicate

        # Proceed with insertion if no duplicate is found
        cursor.execute('''
            INSERT INTO swift_messages (
                transaction_reference, transaction_type, transaction_date, transaction_currency,
                transaction_amount, sender_account, sender_inn, sender_name, sender_address,
                sender_bank_code, receiver_account, receiver_inn, receiver_name, receiver_kpp,
                receiver_bank_code, receiver_bank_name, transaction_purpose, transaction_fees,
                company_info, receiver_info
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            parsed_data.get("transaction_reference"), parsed_data.get("transaction_type"),
            parsed_data.get("transaction_date"), parsed_data.get("transaction_currency"),
            parsed_data.get("transaction_amount"), parsed_data.get("sender_account"),
            parsed_data.get("sender_inn"), parsed_data.get("sender_name"),
            parsed_data.get("sender_address"), parsed_data.get("sender_bank_code"),
            parsed_data.get("receiver_account"), parsed_data.get("receiver_inn"),
            parsed_data.get("receiver_name"), parsed_data.get("receiver_kpp"),
            parsed_data.get("receiver_bank_code"), parsed_data.get("receiver_bank_name"),
            parsed_data.get("transaction_purpose"), parsed_data.get("transaction_fees"),
            json.dumps(parsed_data.get("company_info", {})),  # Ensure JSON serialization of company_info
            json.dumps(parsed_data.get("receiver_info", {}))  # Ensure JSON serialization of receiver_info
        ))
        
        conn.commit()
        print(f"Transaction with reference {parsed_data.get('transaction_reference')} saved to the database.")
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        conn.close()

def extract_mt103_data(message):
    message = message.replace('\r', '\n').replace('\n\n', '\n')
    
    transaction_date, currency, amount = extract_transaction_date_and_currency(message)
    sender_account, sender_inn, sender_name, sender_address = extract_sender_details(message)
    receiver_account, receiver_name, receiver_inn, receiver_kpp = extract_receiver_details(message)
    bank_code, transit_account, bank_name = extract_receiver_bank_details(message)
    
    print(f"Sender details: {sender_name=}, {sender_inn=}, {sender_address=}")
    print(f"Receiver details: {receiver_name=}, {receiver_inn=}, {receiver_kpp=}")
    print(f"Transaction amount: {currency} {amount}")

    company_info = None
    if sender_name:
        company_search_link = search_orginfo(sender_name)
        if company_search_link:
            company_info = fetch_company_details_orginfo(company_search_link)

    receiver_info = get_company_details(receiver_inn) if receiver_inn else None

    return {
        "transaction_reference": extract_transaction_reference(message),
        "transaction_type": extract_transaction_type(message),
        "transaction_date": transaction_date,
        "transaction_currency": currency,
        "transaction_amount": amount,
        "sender_account": sender_account,
        "sender_inn": sender_inn,
        "sender_name": sender_name,
        "sender_address": sender_address,
        "sender_bank_code": extract_sender_bank_code(message),
        "receiver_bank_code": bank_code,
        "receiver_transit_account": transit_account,
        "receiver_bank_name": bank_name,
        "receiver_account": receiver_account,
        "receiver_name": receiver_name,
        "receiver_inn": receiver_inn,
        "receiver_kpp": receiver_kpp,
        "transaction_purpose": extract_transaction_purpose(message),
        "transaction_fees": extract_transaction_fees(message),
        "company_info": company_info,
        "receiver_info": receiver_info
    }

# Process a single SWIFT message file
def process_swift_message(file_path):
    # Attempt to open the file, retrying if necessary
    for _ in range(3):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                message = f.read()
            return extract_mt103_data(message)
        except (FileNotFoundError, PermissionError):
            time.sleep(1)  # Wait a second before retrying
    print(f"Failed to open file {file_path} after multiple attempts.")
    return None  # Return None if file cannot be opened after retries

# Watchdog file handler
class SwiftFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory or not event.src_path.endswith('.txt'):
            return

        parsed_data = process_swift_message(event.src_path)
        if parsed_data:
            file_name = os.path.basename(event.src_path)
            parsed_files[file_name] = parsed_data

            # Save parsed data to JSON file
            parsed_data_path = os.path.join(PARSED_DATA_PATH, f"{file_name}.json")
            with open(parsed_data_path, 'w') as json_file:
                json.dump(parsed_data, json_file)

            # Save parsed data to the database
            save_to_database(parsed_data)
            print(f"Processed and saved data for file: {file_name}")

observer = Observer()
observer.schedule(SwiftFileHandler(), path=SWIFT_FOLDER_PATH, recursive=False)
if not observer.is_alive():
    observer.start()

@app.route('/api/search-orginfo', methods=['GET'])
def api_search_orginfo():
    company_name = request.args.get("company_name")
    org_url = search_orginfo(company_name)
    if org_url:
        company_details = fetch_company_details_orginfo(org_url)
        return jsonify(company_details)
    return jsonify({"error": "No match found"})

@app.route('/api/search-egrul', methods=['GET'])
def api_search_egrul():
    inn = request.args.get("inn")
    company_details = get_company_details(inn)
    if company_details:
        return jsonify(company_details)
    return jsonify({"error": "No match found"})

# API endpoint to get parsed files
@app.route('/api/parsed-swift-files', methods=['GET'])
def get_parsed_files():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM swift_messages")
    rows = cursor.fetchall()
    conn.close()

    parsed_files = []
    for row in rows:
        row_dict = dict(row)
        parsed_files.append(row_dict)

    return jsonify(parsed_files)

# API endpoint to process SWIFT messages from POST data
@app.route('/api/process-swift', methods=['POST'])
def process_swift():
    data = request.json
    message = data.get('message', '')

    try:
        if not message.strip():
            raise ValueError("The SWIFT message cannot be empty.")
        
        result = extract_mt103_data(message)
        
        if not result.get('transaction_reference'):
            raise ValueError("Failed to extract required information")
        
        # Save to database
        save_to_database(result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/update-status/<string:id>', methods=['PATCH'])
def update_status(id):
    new_status = request.json.get('status')
    if not new_status:
        return jsonify({"error": "Missing status"}), 400

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute(
        'UPDATE swift_messages SET status = ? WHERE id = ?', (new_status, id)
    )
    conn.commit()

    if cursor.rowcount > 0:
        conn.close()
        return jsonify({"message": "Status updated successfully"}), 200
    else:
        conn.close()
        return jsonify({"error": "No message found with the given ID"}), 404

# Delete Message Endpoint
@app.route('/api/delete-message/<string:id>', methods=['DELETE'])
def delete_message(id):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Execute the delete command
    cursor.execute('DELETE FROM swift_messages WHERE id = ?', (id,))
    conn.commit()
    
    # Check if the deletion was successful
    if cursor.rowcount > 0:
        conn.close()
        return jsonify({"message": f"Message with reference {id} deleted successfully"}), 200
    else:
        conn.close()
        return jsonify({"error": f"No message found with reference {id}"}), 404

if __name__ == '__main__':
    try:
        app.run(port=3001, debug=True)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()