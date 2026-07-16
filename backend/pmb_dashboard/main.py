import csv
import os
import json
import psycopg2
from psycopg2.extras import execute_values
from fastapi import HTTPException, Query
from fastapi.responses import JSONResponse
import pandas as pd
import re
from datetime import datetime, time
from dotenv import load_dotenv
import subprocess
import random

load_dotenv()

def get_connection():
    return psycopg2.connect(os.getenv("DB_URL"))

PMB_DASHBOARD_ROOT_DIRECTORY = os.getenv("PMB_DASHBOARD_ROOT_DIRECTORY")
PMB_DASHBOARD_CACHE_FILE_NAME = os.getenv("PMB_DASHBOARD_CACHE_FILE_NAME")
PMB_DASHBOARD_CACHE_REFRESH_INTERVAL_MINUTES = os.getenv("PMB_DASHBOARD_CACHE_REFRESH_INTERVAL_MINUTES")

FPY_INTERVAL_HIGH = os.getenv("FPY_INTERVAL_HIGH")
FPY_INTERVAL_LOW = os.getenv("FPY_INTERVAL_LOW")
SPY_INTERVAL_HIGH = os.getenv("SPY_INTERVAL_HIGH")
SPY_INTERVAL_LOW = os.getenv("SPY_INTERVAL_LOW")

# Get environment variables
SHIFT_1_START = os.getenv("SHIFT_1_START", "07:00")
SHIFT_1_END = os.getenv("SHIFT_1_END", "15:00")

SHIFT_2_START = os.getenv("SHIFT_2_START", "15:00")
SHIFT_2_END = os.getenv("SHIFT_2_END", "23:00")

SHIFT_3_START = os.getenv("SHIFT_3_START", "23:00")
SHIFT_3_END = os.getenv("SHIFT_3_END", "07:00")


def get_shift(start_ts, end_ts):
    """
    Determine shift based on start_ts and end_ts timestamps.
    """

    def parse_time(time_str):
        """Parse time string safely"""
        if not time_str:
            return None
        try:
            if len(time_str.split(':')) == 2:
                return datetime.strptime(time_str, "%H:%M").time()
            return datetime.strptime(time_str, "%H:%M:%S").time()
        except Exception as e:
            print(f"[PARSE ERROR] Invalid time: {time_str}")
            return None

    def time_in_range(check_time, start_time, end_time):
        # normal time
        if not check_time or not start_time or not end_time:
            return False
        if start_time <= end_time:
            return start_time <= check_time < end_time
        # overnight range
        return check_time >= start_time or check_time < end_time

    # 🚨 SAFETY CHECK (MOST IMPORTANT)
    if not start_ts or not end_ts:
        print(f"[SHIFT WARNING] Missing time: start_ts={start_ts}, end_ts={end_ts}")
        return None

    # Parse input times
    start_time = parse_time(start_ts)
    end_time = parse_time(end_ts)

    if not start_time or not end_time:
        return None

    # Parse shift times
    shift1_start = parse_time(SHIFT_1_START)
    shift1_end = parse_time(SHIFT_1_END)

    shift2_start = parse_time(SHIFT_2_START)
    shift2_end = parse_time(SHIFT_2_END)

    shift3_start = parse_time(SHIFT_3_START)
    shift3_end = parse_time(SHIFT_3_END)

    def get_single_shift(t):
        if time_in_range(t, shift1_start, shift1_end):
            return 1
        if time_in_range(t, shift2_start, shift2_end):
            return 2
        if time_in_range(t, shift3_start, shift3_end):
            return 3
        return None
    
    start_shift = get_single_shift(start_time)
    end_shift = get_single_shift(end_time)

    if start_shift == end_shift:
        return start_shift
    
    # cross boundary -> use shift of end time
    return None

def extract_columns(file_path):
    """
    Extracts the first and fourth column values from a .psn file.
    
    Args:
        file_path (str): Path to the .psn file
        
    Returns:
        dict: Dictionary with 'first_column' and 'fourth_column' lists
    """
    first_column = []
    fourth_column = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
            for line in file:
                # Skip empty lines
                if not line.strip():
                    continue
                
                # Split the line by tabs or multiple spaces
                parts = line.strip().split()
                
                # If there are enough parts
                if len(parts) >= 4:
                    first_column.append(parts[0])
                    fourth_column.append(parts[3])
                elif len(parts) > 0:
                    # If there are parts but not enough for the fourth column
                    first_column.append(parts[0])
                    fourth_column.append('')  # Add empty string for missing fourth column
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
    
    return {
        'first_column': first_column,
        'fourth_column': fourth_column
    }

def parse_dat_file_headers(lines):
    """
    Parses a .dat file to extract information from each header section.
    Now includes header counter, start_ts, and end_ts for each section.
    Extracts time from the second column (index 1).
    
    Args:
        lines (list): List of lines from the .dat file
        
    Returns:
        list: List of dictionaries containing header information
    """
    header_sections = []
    current_section = None
    header_counter = 0
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('#HDR'):
            # If we have a previous section, finalize it
            if current_section is not None:
                header_sections.append(current_section)
            
            # Increment header counter for each new header
            header_counter += 1
            
            # Parse the new header
            fields = line.split('\t')
            
            # Extract date (3rd field, index 2) and par number (6th field, index 5)
            date = fields[2] if len(fields) > 2 else ''
            par_number = fields[5] if len(fields) > 5 else ''
            
            # Ensure date format is consistent (add 20 prefix if 2-digit year)
            if date and len(date.split("-")[0]) == 2:
                date = '20' + date
            
            # Start new section
            current_section = {
                'date': date,
                'par_number': par_number,
                'header_counter': header_counter,
                'line_count': 0,
                'start_ts': None,
                'end_ts': None,
                'timestamps': [],  # Temporary list to collect timestamps
                'errors': 0
            }
        
        elif current_section is not None and not line.startswith('#HDR') and line:
            # Count non-header, non-empty lines for the current section
            current_section['line_count'] += 1
            
            # Extract timestamp from the data line (2nd column, index 1)
            parts = line.split('\t')
            if len(parts) >= 2:
                timestamp = parts[1].strip()  # This is the time (e.g., "12:55:26")
                # Check if it looks like a time (HH:MM:SS)
                if re.match(r'\d{2}:\d{2}:\d{2}', timestamp):
                    current_section['timestamps'].append(timestamp)

            if len(parts) >= 6:
                error_code = parts[5].strip()
                if error_code == "0":
                    current_section['errors'] += 0
                else:
                    current_section['errors'] += 1

    
    # Don't forget the last section
    if current_section is not None:
        header_sections.append(current_section)
    
    # Process timestamps to get start_ts and end_ts for each section
    for section in header_sections:
        timestamps = section.get('timestamps', [])
        if timestamps:
            # Sort timestamps to get the earliest and latest
            sorted_timestamps = sorted(timestamps)
            section['start_ts'] = sorted_timestamps[0]
            section['end_ts'] = sorted_timestamps[-1]
        else:
            section['start_ts'] = ''
            section['end_ts'] = ''
        
        # Remove the temporary timestamps list
        del section['timestamps']
    
    return header_sections

def process_psn_files_v2(directory_path):
    """
    Finds all .psn files in the specified directory and extracts data.
    Also looks for associated .dat files in the 'data' subfolder.
    Now handles multiple headers per .dat file and extracts .par numbers with header counter.
    
    Args:
        directory_path (str): Path to the directory to scan
        
    Returns:
        dict: Dictionary with .psn filenames as keys and structured data as values
    """
    result = {}
    
    try:
        # Get all the .psn files, it should only be one
        all_files = os.listdir(directory_path)
        psn_files = [file for file in all_files 
                    if file.lower().endswith('.psn') and os.path.isfile(os.path.join(directory_path, file))]
        
        # Check if 'data' subfolder exists
        data_folder_path = os.path.join(directory_path, 'data')
        has_data_folder = os.path.isdir(data_folder_path)
        
        # Goes through all the .psn files. Should be only one
        for psn_file in psn_files:
            file_path = os.path.join(directory_path, psn_file)

            # Extract the 1st and 4th columns in the .psn file to get the product codes and the descriptions
            column_data = extract_columns(file_path)
            
            if column_data:
                # Create the new structured format
                structured_data = []
                
                # Get data files if data folder exists
                data_files = []
                if has_data_folder:
                    try:
                        data_files = os.listdir(data_folder_path)
                    except (PermissionError, FileNotFoundError):
                        print(f"Could not access data folder for {psn_file}")
                
                for i, product_code in enumerate(column_data.get('first_column', [])):
                    product_entry = {
                        'product_code': product_code,
                        'description': column_data.get('fourth_column', [])[i] if i < len(column_data.get('fourth_column', [])) else '',
                        'dat_indexes': []
                    }
                    
                    # Find associated .dat files for this product code
                    if has_data_folder and data_files:
                        associated_dat_files = [
                            file for file in data_files 
                            if file.startswith(product_code) and file.endswith('.dat')
                        ]
                        
                        for dat_file in associated_dat_files:
                            # Extract the 3-digit number between the product code and .dat
                            match = re.search(f'{product_code}(\\d{{3}})\\.dat', dat_file)

                            if match:
                                index = match.group(1)
                                
                                # Read the .dat file to extract headers and process each section
                                dat_file_path = os.path.join(data_folder_path, dat_file)
                                try:
                                    with open(dat_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                        lines = f.readlines()
                                    
                                    # Parse headers and their sections
                                    header_sections = parse_dat_file_headers(lines)
                                    
                                    # Create a dat_info entry for each header section
                                    for header_info in header_sections:
                                        dat_info = {
                                            'index': index,
                                            'date': header_info['date'],
                                            'par_number': header_info['par_number'],
                                            'header_counter': header_info['header_counter'],
                                            'line_count': header_info['line_count'],
                                            'start_ts': header_info['start_ts'],  # Add this line
                                            'end_ts': header_info['end_ts'],       # Add this line
                                            'errors': header_info['errors'],
                                        }
                                        product_entry['dat_indexes'].append(dat_info)
                                        
                                except (IOError, UnicodeDecodeError) as e:
                                    print(f"Error reading {dat_file}: {e}")
                    
                    structured_data.append(product_entry)
                
                result[psn_file] = structured_data
    except (PermissionError, FileNotFoundError):
        pass
    
    return result


def get_directory_structure_with_psn_data(root_path, max_depth=2):
    """
    Creates a dictionary containing directories and their subdirectories
    up to max_depth levels deep, including PSN file data and associated .dat files.
    
    Args:
        root_path (str): Path to the root directory to scan
        max_depth (int): Maximum depth of subdirectories to include (default: 2)
        
    Returns:
        dict: Dictionary with directory structure and data
    """
    # Check if the directory exists
    if not os.path.isdir(root_path):
        print(f"Error: The directory '{root_path}' does not exist.")
        return {}
    
    # Initialize the result dictionary
    directory_dict = {}
    
    # Get all items in the root directory
    try:
        category_items = os.listdir(root_path)
    except PermissionError:
        print(f"Permission denied: Cannot access '{root_path}'")
        return {}
    
    # Filter to keep only directories in the root which should be
    # [global_lp, ...]
    category_dirs = [item for item in category_items 
                if os.path.isdir(os.path.join(root_path, item))]
    
    # For each directory in the root
    for category_name in category_dirs:
        category_path = os.path.join(root_path, category_name)

        # Create first level with category
        directory_dict[category_name] = {}
        
        # If we're at max depth, look for .psn files
        # In case second level is directly with the .psn files and data folder
        if max_depth == 0:

            # Process the psn files
            psn_data = process_psn_files_v2(category_path)
            if psn_data:
                directory_dict[category_name]['psn_data'] = psn_data

        # If we haven't reached max depth, scan for subdirectories
        elif max_depth > 0:
            try:
                # Get all items in this directory
                rack_items = os.listdir(category_path)
                
                # Filter to keep only directories
                rack_dirs = [item for item in rack_items 
                              if os.path.isdir(os.path.join(category_path, item))]
                
                # For each subdirectory
                # This is level 2 which is the rack
                for rack_name in rack_dirs:
                    rack_path = os.path.join(category_path, rack_name)

                    # Add the rack to the category
                    directory_dict[category_name][rack_name] = {}
                    
                    # If we're at max depth-1, look for .psn files
                    if max_depth == 1:

                        # Process the psn files
                        psn_data = process_psn_files_v2(rack_path)
                        if psn_data:
                            directory_dict[category_name][rack_name]['psn_data'] = psn_data

                    # If we still haven't reached max depth, scan for sub-subdirectories
                    elif max_depth > 1:
                        try:
                            # Get all items in this subdirectory
                            module_items = os.listdir(rack_path)
                            
                            # Filter to keep only directories
                            # Level3 this is the module of the rack
                            module_dirs = [item for item in module_items 
                                          if os.path.isdir(os.path.join(rack_path, item))]
                            
                            # For each sub-subdirectory
                            for module_name in module_dirs:
                                module_path = os.path.join(rack_path, module_name)
                                directory_dict[category_name][rack_name][module_name] = {}
                                
                                # If we're at max depth, look for .psn files
                                if max_depth == 2:

                                    # Process psn files
                                    psn_data = process_psn_files_v2(module_path)
                                    if psn_data:
                                        directory_dict[category_name][rack_name][module_name]['psn_data'] = psn_data
                        except (PermissionError, FileNotFoundError):
                            # Skip directories we can't access
                            continue
            except (PermissionError, FileNotFoundError):
                # Skip directories we can't access
                continue
    
    return directory_dict

def load_active_orders():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT pr_cod, pr_dela, pr_sys, pr_panala
        FROM prod_time
        WHERE pr_panala IS NULL
        ORDER BY pr_dela DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    # Build dict: (product_code, date) → pr_sys
    orders_map = {}

    for pr_cod, pr_dela, pr_sys, pr_panala in rows:
        if pr_cod not in orders_map:
            orders_map[pr_cod] = []

        orders_map[pr_cod].append({
            "pr_sys": pr_sys,
            "start": pr_dela,
            "end": pr_panala
        })

    return orders_map

def create_expanded_dataframe(directory_dict, orders_map):
    """
    Creates a pandas DataFrame from the directory structure with PSN data and .dat files.
    Creates a separate row for each .dat file section (header), avoiding duplication.
    Uses standardized column names and includes .par Number and Header Counter.
    
    Args:
        directory_dict (dict): Dictionary with directory structure and data
        
    Returns:
        list: List of dictionaries representing the DataFrame records
    """
    def to_datetime(val):
        if isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(str(val))
        except:
            return None

    def find_order(product_code, date, start_ts, orders_map):
        if not product_code or not date or not start_ts:
            return None

        try:
            record_dt = datetime.strptime(f"{date} {start_ts}", "%Y-%m-%d %H:%M:%S")
        except:
            return None

        for order in orders_map.get(product_code, []):
            pr_start = to_datetime(order["start"])
            pr_end = to_datetime(order["end"])

            if not pr_start:
                continue

            if pr_end is None:
                if record_dt >= pr_start:
                    return order["pr_sys"]
            else:
                if pr_start <= record_dt <= pr_end:
                    return order["pr_sys"]

        return None

    # Dictionary to track unique combinations to avoid duplication
    # Key: (product_code, dat_number, par_number, header_counter), Value: record
    unique_records = {}
    
    # Traverse the directory structure
    for category, category_data in directory_dict.items():
        for rack, rack_data in category_data.items():
            for module, module_data in rack_data.items():
                if 'psn_data' in module_data:
                    for psn_file, structured_data in module_data['psn_data'].items():
                        # Extract module name from PSN filename (without extension)
                        module_name = module
                        
                        # Process each product entry
                        for product_entry in structured_data:
                            product_code = product_entry['product_code']
                            description = product_entry['description']
                            
                            # Get associated .dat file indexes if available
                            dat_indexes = product_entry.get('dat_indexes', [])
                            
                            if dat_indexes:
                                # Create a separate row for each dat index (now including header_counter)
                                start_ts = None
                                end_ts = None
                                for dat_index_info in dat_indexes:
                                    dat_number = dat_index_info.get('index', '')
                                    par_number = dat_index_info.get('par_number', '')
                                    header_counter = dat_index_info.get('header_counter', 1)
                                    date = dat_index_info.get('date', 'Null')
                                    line_count = dat_index_info.get('line_count', 0)
                                    start_ts = dat_index_info.get('start_ts', None)  # Add this line
                                    end_ts = dat_index_info.get('end_ts', None)      # Add this line
                                    order_value = find_order(product_code, date, start_ts, orders_map)
                                    errors = dat_index_info.get('errors', 0)
                                    
                                    # Create a unique key for this combination
                                    key = (product_code, dat_number, par_number, header_counter)
                                    
                                    # Only add if this combination doesn't exist yet
                                    if key not in unique_records:
                                        unique_records[key] = {
                                            'Date': date,
                                            'Line': '',
                                            'Operator': '',
                                            'Shift': get_shift(start_ts, end_ts),
                                            'Product Code': product_code,
                                            'Order': order_value if order_value else 'N/A',
                                            'QTY': 0,
                                            'Description': description,
                                            'Rack': rack,
                                            'Category': category,
                                            'Module': module_name,
                                            '.dat Number': dat_number,
                                            '.par Number': par_number,
                                            'Header Counter': header_counter,
                                            'Start TS': start_ts,
                                            'End TS': end_ts,
                                            'Nr. of Tests': line_count,
                                            'Nr. of Errors': errors,
                                            'Percent of Erros': round(errors/line_count*100, 3) if line_count !=0 else 0,
                                            'FPY': 90,
                                            'SPY': 95,
                                            'Status': 'Running'
                                        }
                            else:
                                key = (product_code, '', '', 1)
                                if key not in unique_records:
                                    unique_records[key] = {
                                        'Date': '',
                                        'Line': '',
                                        'Operator': '',
                                        'Shift': '',
                                        'Product Code': product_code,
                                        'Order': 'XXXXXXXXXX',
                                        'QTY': 0,
                                        'Description': description,
                                        'Rack': rack,
                                        'Category': category,
                                        'Module': module_name,
                                        '.dat Number': '',
                                        '.par Number': '',
                                        'Header Counter': 1,
                                        'Start TS': '',
                                        'End TS': '',
                                        'Nr. of Tests': 0,
                                        'Nr. of Errors': 0,
                                        'Percent of Erros': 0,
                                        'FPY': 0,
                                        'SPY': 0,
                                        'Status': 'Running'
                                    }
    
    # Define column order (updated to include Header Counter)
    column_order = ['Date', 'Line', 'Operator', 'Shift', 'Product Code', 'Order', 'QTY', 'Description', 'Rack', 'Category', 'Module', '.dat Number', '.par Number', 'Header Counter', 'Start TS', 'End TS', 'Nr. of Tests', 'Nr. of Errors', 'Percent of Erros', 'FPY', 'SPY', 'Status']
    
    # Create list of dictionaries in the specified column order
    data = []
    for record in unique_records.values():
        ordered_record = {col: record.get(col, None) for col in column_order}
        data.append(ordered_record)
    
    return data

def save_expanded_data(data, output_file='expanded_data.json'):
    """
    Creates expanded data from directory structure and saves it to a JSON file
    Updated to handle .par Number and Header Counter fields
    """
    try:
        # Create directory if it doesn't exist
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # Load existing data if file exists
        existing_data = []
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            try:
                with open(output_file, 'r') as f:
                    existing_data = json.load(f)
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Loaded {len(existing_data)} existing records")
            except json.JSONDecodeError:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error reading existing JSON file. Creating new file.")
        
         # Create a dictionary to map key fields to record index for fast lookup
        # Key fields that uniquely identify a record (updated to include Header Counter)
        existing_records_map = {}
        for idx, record in enumerate(existing_data):
            record_key = (
                record.get('Date', ''), 
                record.get('Product Code', ''), 
                record.get('Rack', ''),
                record.get('Category', ''),
                record.get('Module', ''),
                record.get('.dat Number', ''),
                record.get('.par Number', ''),
                record.get('Nr. of Tests', ''),
                record.get('Nr. of Errors', ''),
                record.get('Header Counter', 1)  # New key field
            )
            existing_records_map[record_key] = idx

        # Track statistics
        new_records_count = 0
        updated_records_count = 0

        # Process new data
        for new_record in data:
            record_key = (
                new_record.get('Date', ''), 
                new_record.get('Product Code', ''), 
                new_record.get('Rack', ''),
                new_record.get('Category', ''),
                new_record.get('Module', ''),
                new_record.get('.dat Number', ''),
                new_record.get('.par Number', ''),
                new_record.get('Nr. of Tests', ''),
                new_record.get('Nr. of Errors', ''),
                new_record.get('Header Counter', 1)  # New key field
            )
            
            if record_key in existing_records_map:
                # Record exists - update non-key fields if they've changed
                idx = existing_records_map[record_key]
                existing_record = existing_data[idx]
                
                # Check if any non-key fields need updating
                updated = False
                for field in ['Description', 'Line Count', 'Start TS', 'End TS', 'FPY', 'SPY']:
                    if new_record.get(field) != existing_record.get(field):
                        existing_record[field] = new_record.get(field)
                        updated = True
                
                if updated:
                    updated_records_count += 1
            else:
                # New record - add it
                existing_data.append(new_record)
                new_records_count += 1

        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Added {new_records_count} new records")
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Updated {updated_records_count} records")

        sorted_data = sorted(existing_data, key=lambda x: x["Date"], reverse=True)

        # Save the updated data back to the file
        with open(output_file, 'w') as f:
            json.dump(sorted_data, f, indent=2)
        
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Expanded data saved to {output_file}")
        
        if new_records_count > 0 or updated_records_count > 0:
            return True
        else:
            return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error saving expanded data: {e}")
        return False

def load_expanded_data(input_file='test.json', as_dataframe=True, filter_start_date=None, filter_end_date=None, filter_product_code=None):
    """
    Loads expanded data from a JSON file with optional date filtering
    
    Args:
        input_file (str): Path to the input JSON file
        as_dataframe (bool): Whether to return the data as a pandas DataFrame
        filter_start_date (str): Date to filter by in 'YYYY-MM-DD' format. If None, returns all data
        filter_end_date (str): Date to filter by in 'YYYY-MM-DD' format. If None, returns all data
        filter_product_code (str): Product Code to filter by. If None, returns all data
        
    Returns:
        pandas.DataFrame or list: The loaded data (filtered by date if specified), 
                                 or None if the file doesn't exist or can't be read
    """
    try:
        if os.path.exists(input_file):
            with open(input_file, 'r') as f:
                data_list = json.load(f)
            
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Expanded data loaded from {input_file}")
            
            original_count = len(data_list)

            # Apply date filter if specified
            if filter_start_date:
                data_list = [record for record in data_list if record.get('Date') <= filter_start_date]
            if filter_end_date:
                data_list = [record for record in data_list if record.get('Date') >= filter_end_date]
            if filter_product_code:
                data_list = [record for record in data_list if record.get('Product Code') == filter_product_code]
            filtered_count = len(data_list)
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Filtered by '{filter_start_date}' - '{filter_end_date}' with Product Code {filter_product_code}: {filtered_count}/{original_count} records")
            
            if as_dataframe:
                return pd.DataFrame(data_list)
            else:
                return data_list
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] File {input_file} not found")
            return None
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error loading expanded data: {e}")
        return None

def load_expanded_data_db(startDate=None, endDate=None, productCode=None):
    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT *
        FROM pmb_dashboard_data
        WHERE 1=1
    """

    params = []

    if startDate:
        query += " AND date >= %s"
        params.append(startDate)

    if endDate:
        query += " AND date <= %s"
        params.append(endDate)

    if productCode:
        query += " AND product_code = %s"
        params.append(productCode)

    query += " ORDER BY date DESC"

    cur.execute(query, params)

    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]

    data = [dict(zip(columns, row)) for row in rows]

    cur.close()
    conn.close()

    return data

def run_pmb_dashboard_refresh():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Running pmb_dashboard refresh!")
    # subprocess.Popen(["python", "pmb_dashboard/main.py"])

     # ✅ LOAD orders FIRST
    orders_map = load_active_orders()
    target_directory = PMB_DASHBOARD_ROOT_DIRECTORY
    df = create_expanded_dataframe(get_directory_structure_with_psn_data(target_directory), orders_map)
    # result = save_expanded_data(df, PMB_DASHBOARD_CACHE_FILE_NAME)
    result = save_expanded_data_to_db(df)

    return result

async def get_specific_dat_file(filename: str):
    directory = os.environ["PMB_DASHBOARD_ROOT_DIRECTORY"] + "/global_lp"
    filepath = os.path.join(directory, filename)

    # Check if the file exists
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    data = []
    try:
        with open(filepath, 'r', encoding='latin1', errors='ignore') as file:
            reader = csv.reader(file, delimiter='\t')
            for row in reader:
                data.append(row)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_pmb_dashboard_available_dates():
    """
    Get list of available dates from the PMB dashboard data
    
    Returns:
        dict: Response with available dates, count, and metadata
    """
    try:
        # Check if the cache file exists
        if not os.path.exists(PMB_DASHBOARD_CACHE_FILE_NAME):
            return {
                "error": "Data file not found",
                "available_dates": [],
                "count": 0
            }
        
        # Load the data
        # with open(PMB_DASHBOARD_CACHE_FILE_NAME, 'r') as f:
            # data_list = json.load(f)
            # read from db
        data_list = get_dashboard_data()
        
        if not data_list:
            return {
                "available_dates": [],
                "count": 0,
                "message": "No data available"
            }
        
        # Extract unique dates
        dates_set = set()
        for record in data_list:
            date_value = record.get('Date')
            if date_value:
                dates_set.add(str(date_value))
        
        # Convert to sorted list (most recent first)
        available_dates = sorted(list(dates_set), reverse=True)
        
        # Log the operation
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Found {len(available_dates)} unique dates in PMB dashboard data")
        
        return available_dates

        # return {
        #     "available_dates": available_dates,
        #     "count": len(available_dates),
        #     "latest_date": available_dates[0] if available_dates else None,
        #     "oldest_date": available_dates[-1] if available_dates else None,
        #     "total_records": len(data_list)
        # }
        
    except json.JSONDecodeError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Invalid JSON data format")
        
    except FileNotFoundError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] File not found: {e}")
        raise HTTPException(status_code=404, detail="Data file not found")
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error getting available dates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get available dates: {str(e)}")

def get_pmb_dashboard_available_dates_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT date
        FROM pmb_dashboard_data
        ORDER BY date DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [str(r[0]) for r in rows if r[0]]

def get_pmb_dashboard_available_product_codes():
    """
    Get list of available product codes from the PMB dashboard data
    
    Returns:
        dict: Response with available product codes, count, and metadata
    """
    try:
        # Check if the cache file exists
        if not os.path.exists(PMB_DASHBOARD_CACHE_FILE_NAME):
            return {
                "error": "Data file not found",
                "product_codes": [],
                "count": 0
            }
        
        # Load the data
        with open(PMB_DASHBOARD_CACHE_FILE_NAME, 'r') as f:
            data_list = json.load(f)
        
        if not data_list:
            return {
                "product_codes": [],
                "count": 0,
                "message": "No data available"
            }
        
        # Extract unique dates
        product_codes_set = set()
        for record in data_list:
            product_code_value = record.get('Product Code')
            if product_code_value and product_code_value.strip():  # Check for non-empty product codes
                product_codes_set.add(product_code_value.strip())
        
        # Convert to sorted list (most recent first)
        available_product_codes = sorted(list(product_codes_set), reverse=True)
        
        # Log the operation
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Found {len(available_product_codes)} unique product codes in PMB dashboard data")
        
        return available_product_codes

        # return {
        #     "available_dates": available_dates,
        #     "count": len(available_dates),
        #     "latest_date": available_dates[0] if available_dates else None,
        #     "oldest_date": available_dates[-1] if available_dates else None,
        #     "total_records": len(data_list)
        # }
        
    except json.JSONDecodeError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Invalid JSON data format")
        
    except FileNotFoundError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] File not found: {e}")
        raise HTTPException(status_code=404, detail="Data file not found")
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error getting available product codes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get available product codes: {str(e)}")

def get_pmb_dashboard_available_product_codes_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT product_code
        FROM pmb_dashboard_data
        ORDER BY product_code DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [r[0] for r in rows if r[0]]

def to_int(value):
    try:
        return int(value)
    except:
        return None
    
def to_float(value):
    try:
        return float(value)
    except:
        return None

def save_expanded_data_to_db(data):
    try:
        conn = get_connection()
        cur = conn.cursor()

        values = []
        for r in data:
            values.append((
                r.get("Date") or None,
                to_int(r.get("Shift")),
                r.get("Product Code"),
                r.get("Description"),

                r.get("Category"),
                r.get("Rack"),
                r.get("Module"),

                r.get(".dat Number"),
                r.get(".par Number"),
                to_int(r.get("Header Counter")),

                r.get("Start TS") or None,
                r.get("End TS") or None,

                to_int(r.get("Nr. of Tests")),
                to_int(r.get("Nr. of Errors")),
                to_float(r.get("Percent of Erros")),

                to_float(r.get("FPY")),
                to_float(r.get("SPY")),
                r.get("Status"),
                r.get("Order")
            ))

        query = """
        INSERT INTO pmb_dashboard_data (
            date, shift, product_code, description,
            category, rack, module,
            dat_number, par_number, header_counter,
            start_ts, end_ts,
            nr_tests, nr_errors, percent_errors,
            fpy, spy, status, order_id
        ) VALUES %s
        ON CONFLICT (
            date, product_code, rack, category, module,
            dat_number, par_number, header_counter
        )
        DO UPDATE SET
            description = EXCLUDED.description,
            start_ts = EXCLUDED.start_ts,
            end_ts = EXCLUDED.end_ts,
            nr_tests = EXCLUDED.nr_tests,
            nr_errors = EXCLUDED.nr_errors,
            percent_errors = EXCLUDED.percent_errors,
            fpy = EXCLUDED.fpy,
            spy = EXCLUDED.spy,
            updated_at = NOW(),
            order_id = EXCLUDED.order_id;
        """

        execute_values(cur, query, values)

        conn.commit()
        cur.close()
        conn.close()

        print(f"[{datetime.now()}] Inserted/Updated {len(values)} rows")
        return True

    except Exception as e:
        print(f"[DB ERROR] {e}")
        return False

def get_dashboard_data():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            date as "Date",
            product_code as "Product Code",
            rack as "Rack",
            category as "Category",
            module as "Module",
            dat_number as ".dat Number",
            par_number as ".par Number",
            header_counter as "Header Counter",
            start_ts as "Start TS",
            end_ts as "End TS",
            nr_tests as "Nr. of Tests",
            nr_errors as "Nr. of Errors",
            percent_errors as "Percent of Erros",
            fpy as "FPY",
            spy as "SPY",
            shift as "Shift",
            description as "Description",
            status as "Status"
        FROM pmb_dashboard_data
        ORDER BY date DESC
    """)

    rows = cur.fetchall()

    colnames = [desc[0] for desc in cur.description]

    data = [dict(zip(colnames, row)) for row in rows]

    cur.close()
    conn.close()

    return data

if __name__ == "__main__":
     # ✅ LOAD orders FIRST
    orders_map = load_active_orders()
    # Get the directory path from user input
    target_directory = PMB_DASHBOARD_ROOT_DIRECTORY
    df = create_expanded_dataframe(get_directory_structure_with_psn_data(target_directory), orders_map)
    # save_expanded_data(df, PMB_DASHBOARD_CACHE_FILE_NAME)
    save_expanded_data_to_db(df)