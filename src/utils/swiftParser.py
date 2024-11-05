from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from transliterate import translit

app = Flask(__name__)
CORS(app)

ENTITY_LABELS = ["OOO", "LLC", "MCHJ", "Inc", "Corp", "Ltd", "GmbH", "AG", "PJSC"]

def transliterate_text(text):
    if text is None:
        return None
    try:
        # Try to detect if the text contains Cyrillic characters
        if any(ord(char) in range(0x0400, 0x04FF) for char in text):
            return translit(text, 'ru', reversed=True)
        return text
    except Exception as e:
        print(f"Error in transliteration: {e}")
        return text

def clean_company_name(name):
    pattern = r'\b(?:' + '|'.join(ENTITY_LABELS) + r')\b'
    name = re.sub(pattern, '', name, flags=re.IGNORECASE).strip()
    name = name.replace("'", "").replace('"', "").replace('/', '')
    return transliterate_text(name.strip())

def extract_transaction_reference(message):
    match = re.search(r":20:([^\n]+)", message)
    return match.group(1) if match else None

def extract_transaction_type(message):
    match = re.search(r":23B:([^\n]+)", message)
    return match.group(1) if match else None

def extract_transaction_date_and_currency(message):
    match = re.search(r":32A:(\d{6})([A-Z]{3})([\d,]+)", message)
    if match:
        raw_date, currency, amount = match.groups()
        formatted_date = datetime.strptime(raw_date, "%y%m%d").strftime("%Y-%m-%d")
        formatted_currency = f"{currency} {amount.replace(',', '.')}"
        return formatted_date, formatted_currency
    return None, None

def extract_sender_details(message):
    match = re.search(r":50K:/(\d+)\n(?:INN(\d+)\n)?([^\n]+)\n((?:[^\n]+(?:\n(?!:\d{2}[A-Z]:))*)?)", message)
    if match:
        account = match.group(1)
        inn = match.group(2) if match.group(2) else None
        name = match.group(3).strip()
        clean_name = clean_company_name(name)
        address = match.group(4).strip().replace("\n", ", ")
        return account, inn, clean_name, transliterate_text(address)
    return None, None, None, None

def extract_sender_bank_code(message):
    match = re.search(r":52A:([^\n]+)|:53B:([^\n]+)", message)
    if match:
        return match.group(1) or match.group(2)
    return None

def extract_receiver_bank_code_and_name(message):
    bank_info = re.search(r":57D://([^\n]+)", message)
    bank_name = re.search(r":57D:[^\n]+\n([^\n]+)", message)
    if bank_info:
        full_code = bank_info.group(1)
        bank_code, transit_account = full_code.split(".", 1)
        bank_name = transliterate_text(bank_name.group(1)) if bank_name else None
        return bank_code, transit_account, bank_name
    return None, None, None

def extract_receiver_account_and_name(message):
    account = re.search(r":59:/(\d+)", message)
    inn_kpp_name = re.search(r":59:/\d+\n(?:INN(\d+)\.KPP(\d+)\s+)?([^\n]+)", message)
    inn = inn_kpp_name.group(1) if inn_kpp_name and inn_kpp_name.group(1) else None
    kpp = inn_kpp_name.group(2) if inn_kpp_name and inn_kpp_name.group(2) else None
    name = transliterate_text(inn_kpp_name.group(3)) if inn_kpp_name else None
    return (account.group(1) if account else None, name, inn, kpp)

def extract_transaction_purpose(message):
    match = re.search(r":70:([\s\S]+?)(?=(:71A:))", message)
    return transliterate_text(match.group(1).strip()) if match else None

def extract_transaction_fees(message):
    match = re.search(r":71A:([^\n]+)", message)
    return match.group(1) if match else None

def search_orginfo(company_name):
    search_url = f"https://orginfo.uz/en/search/organizations/?q={company_name}&sort=active"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        match_link = None
        for link in soup.find_all("a", href=True):
            if company_name.lower() in link.text.lower():
                match_link = urljoin("https://orginfo.uz", link['href'])
                break
        return match_link
    except requests.RequestException as e:
        print(f"Error searching for company: {e}")
    return None

def fetch_company_details(org_url):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(org_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        management_info = {}
        ceo_section = soup.find("h5", string="Management information")
        if ceo_section:
            ceo_name = transliterate_text(ceo_section.find_next("a").text.strip())
            management_info['CEO'] = ceo_name

        founders = []
        founder_section = soup.find("h5", string="Founders")
        if founder_section:
            for founder_row in founder_section.find_next_sibling("div").find_all("div", class_="row"):
                founder_name_tag = founder_row.find("a")
                if founder_name_tag:
                    founder_name = transliterate_text(founder_name_tag.text.strip())
                    founders.append({"owner": founder_name})
            management_info['Founders'] = founders

        pdf_url = urljoin(org_url, "pdf")
        management_info['PDF Link'] = pdf_url
        return management_info
    except requests.RequestException as e:
        print(f"Error fetching company details: {e}")
    return None

def get_receiver_info(inn):
    url = f"https://egrul.itsoft.ru/{inn}"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        ceo_div = soup.find("div", id="chief")
        ceo_name = transliterate_text(ceo_div.find("a").text.strip()) if ceo_div else None

        founders = []
        founders_div = soup.find("div", id="СвУчредит")
        if founders_div:
            for founder_tag in founders_div.find_all("a"):
                founder_name = transliterate_text(founder_tag.text.strip())
                founders.append({"owner": founder_name})

        pdf_link = url
        receiver_info = {
            "CEO": ceo_name,
            "Founders": founders,
            "PDF Link": pdf_link
        }

        return receiver_info
    except Exception as e:
        print(f"Error retrieving data: {e}")
        return None

def extract_mt103_data(message):
    transaction_date, transaction_currency = extract_transaction_date_and_currency(message)
    sender_account, sender_inn, sender_name, sender_address = extract_sender_details(message)
    receiver_account, receiver_name, receiver_inn, receiver_kpp = extract_receiver_account_and_name(message)
    bank_code, transit_account, bank_name = extract_receiver_bank_code_and_name(message)

    company_info = None
    if sender_name:
        company_search_link = search_orginfo(sender_name)
        if company_search_link:
            company_info = fetch_company_details(company_search_link)

    receiver_info = get_receiver_info(receiver_inn)

    return {
        "transaction_reference": extract_transaction_reference(message),
        "transaction_type": extract_transaction_type(message),
        "transaction_date": transaction_date,
        "transaction_currency": transaction_currency,
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

@app.route('/api/process-swift', methods=['POST'])
def process_swift():
    data = request.json
    message = data.get('message', '')

    try:
        if not message.strip():
            raise ValueError("The SWIFT message cannot be empty.")
        
        result = extract_mt103_data(message)
        print("Receiver information fetched:", result.get("receiver_info"))
        return jsonify(result)
    except Exception as e:
        print("Error processing message:", str(e))
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(port=3001)