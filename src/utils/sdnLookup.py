from flask import Flask, jsonify, request
from flask_cors import CORS
import xml.etree.ElementTree as ET
import json
import os
import requests

app = Flask(__name__)
CORS(app)

XML_FILE_PATH = os.path.abspath('./public/data/sdn.xml')
CACHE_FILE_PATH = os.path.abspath('./public/data/sdn_cache.json')
SDN_URL = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML'

def download_sdn_file():
    """Downloads the SDN XML file and replaces the old file."""
    try:
        # Set a timeout for the request
        response = requests.get(SDN_URL, timeout=10)
        response.raise_for_status()  # Check if the download was successful

        # Save the downloaded content to XML_FILE_PATH
        with open(XML_FILE_PATH, 'wb') as file:
            file.write(response.content)
        print("SDN file downloaded and saved successfully.")

        # Delete the cache file if it exists
        if os.path.exists(CACHE_FILE_PATH):
            os.remove(CACHE_FILE_PATH)
            print("Cache file deleted successfully.")

        return {"status": "SDN list downloaded and cache cleared successfully"}
    except requests.Timeout:
        print("Download timed out.")
        return {"status": "Download timed out", "error": "The download request timed out."}
    except requests.RequestException as e:
        print(f"Error downloading SDN file: {e}")
        return {"status": "Error downloading SDN file", "error": str(e)}


def parse_xml_to_json():
    """Parses the XML file and saves data to JSON cache."""
    try:
        print("Parsing XML file to update SDN list...")
        
        # Ensure the directory for the cache file exists
        os.makedirs(os.path.dirname(CACHE_FILE_PATH), exist_ok=True)
        
        tree = ET.parse(XML_FILE_PATH)
        root = tree.getroot()

        namespace = ''
        if '}' in root.tag:
            namespace = root.tag.split('}')[0] + '}'

        sdn_entries = []
        for entry in root.findall(f".//{namespace}sdnEntry"):
            sdn_entry = {}
            sdn_entry['uid'] = entry.find(f"{namespace}uid").text if entry.find(f"{namespace}uid") is not None else ""

            # Extract full name by combining firstName, middleName, and lastName
            first_name = entry.find(f"{namespace}firstName").text if entry.find(f"{namespace}firstName") is not None else ""
            middle_name = entry.find(f"{namespace}middleName").text if entry.find(f"{namespace}middleName") is not None else ""
            last_name = entry.find(f"{namespace}lastName").text if entry.find(f"{namespace}lastName") is not None else ""
            full_name = " ".join([first_name, middle_name, last_name]).strip()
            sdn_entry['name'] = full_name

            sdn_entry['type'] = entry.find(f"{namespace}sdnType").text if entry.find(f"{namespace}sdnType") is not None else ""
            
            # AKA List (Alternate Names)
            aka_list = entry.find(f"{namespace}akaList")
            if aka_list is not None:
                sdn_entry['aka_names'] = [
                    aka.find(f"{namespace}lastName").text for aka in aka_list.findall(f"{namespace}aka") 
                    if aka.find(f"{namespace}lastName") is not None
                ]

            # Address List
            address_list = entry.find(f"{namespace}addressList")
            if address_list is not None:
                addresses = []
                for address in address_list.findall(f"{namespace}address"):
                    city = address.find(f"{namespace}city").text if address.find(f"{namespace}city") is not None else ""
                    country = address.find(f"{namespace}country").text if address.find(f"{namespace}country") is not None else ""
                    addresses.append({"city": city, "country": country})
                sdn_entry['addresses'] = addresses

            # Program List (Sanctions programs)
            program_list = entry.find(f"{namespace}programList")
            if program_list is not None:
                sdn_entry['programs'] = [
                    program.text for program in program_list.findall(f"{namespace}program") if program is not None
                ]

            # Date of Birth
            dob_feature = entry.find(f"{namespace}dateOfBirthList")
            if dob_feature is not None:
                dob_item = dob_feature.find(f"{namespace}dateOfBirthItem/{namespace}dateOfBirth")
                sdn_entry['date_of_birth'] = dob_item.text if dob_item is not None else ""

            # ID List with idType and idNumber
            id_list = entry.find(f"{namespace}idList")  # Ensure lowercase 'idList' matches XML structure
            if id_list is not None:
                ids = []
                for id_item in id_list.findall(f"{namespace}id"):
                    id_type = id_item.find(f"{namespace}idType").text if id_item.find(f"{namespace}idType") is not None else ""
                    id_number = id_item.find(f"{namespace}idNumber").text if id_item.find(f"{namespace}idNumber") is not None else ""
                    ids.append({"id_type": id_type, "id_number": id_number})
                sdn_entry['ids'] = ids

            # Remarks
            remarks = entry.find(f"{namespace}remarks")
            sdn_entry['remarks'] = remarks.text if remarks is not None else ""

            sdn_entries.append(sdn_entry)

        # Save the data to a JSON cache file
        print("Attempting to write to JSON cache file.")
        with open(CACHE_FILE_PATH, 'w') as cache_file:
            json.dump(sdn_entries, cache_file)
        print("Successfully wrote to JSON cache file.")

        return sdn_entries
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error: {e}")
        return []

@app.route('/api/sdn-list', methods=['GET'])
def get_sdn_list():
    # Return cached JSON data if it exists
    if os.path.exists(CACHE_FILE_PATH):
        with open(CACHE_FILE_PATH, 'r') as cache_file:
            sdn_entries = json.load(cache_file)
    else:
        sdn_entries = parse_xml_to_json()
    return jsonify(sdn_entries)

@app.route('/api/update-sdn-list', methods=['POST'])
def update_sdn_list():
    # Download the new XML file and delete cache, then parse XML and update JSON cache
    download_result = download_sdn_file()
    if "error" in download_result:
        return jsonify(download_result), 500
    
    sdn_entries = parse_xml_to_json()
    return jsonify({"status": "SDN list updated", "entries_count": len(sdn_entries)})

if __name__ == '__main__':
    app.run(debug=True)
