import pandas as pd
import asyncio
import ipaddress
import platform
import socket
import psutil


import json
import asyncio
import os
from datetime import datetime

import traceback

import os
import getpass
import pandas as pd
# from office365.runtime.auth.user_credential import UserCredential
# from office365.sharepoint.client_context import ClientContext
from dotenv import load_dotenv
load_dotenv()

SITE_URL = os.getenv("IPS_MONITORING_SITE_URL")
LIST_NAME = os.getenv("IPS_MONITORING_LIST_NAME")
OUTPUT_FILE = "./ip_list_read.xlsx"
IPS_USERNAME = os.getenv("SMTP_USERNAME")
IPS_PASSWORD = os.getenv("SMTP_PASSWORD")


# # File to store the scan results
# CACHE_FILE = "ips_monitoring/connected_ips_cache.json"

# async def update_connected_ips_cache():
#     while True:
#         try:
#             current_network = "10.29.165.0/24"
#             connected_ips = await scan_subnet(current_network)
            
#             cache_data = {
#                 "timestamp": datetime.now().isoformat(),
#                 "connected_ips": connected_ips
#             }
            
#             # Direct write to file (simpler approach)
#             with open(CACHE_FILE, 'w') as f:
#                 json.dump(cache_data, f)
            
#             print(f"Cache updated with {len(connected_ips)} connected IPs")
#         except Exception as e:
#             print(f"Error updating cache: {str(e)}")
#             print(f"Error details: {traceback.format_exc()}")
        
#         # Wait for 5 seconds before the next scan
#         await asyncio.sleep(5)

# def read_connected_ips_cache():
#     try:
#         if os.path.exists(CACHE_FILE) and os.path.getsize(CACHE_FILE) > 0:
#             with open(CACHE_FILE, 'r') as f:
#                 cache_data = json.load(f)
#             return cache_data
#         else:
#             # Return default empty data if file doesn't exist or is empty
#             return {"timestamp": None, "connected_ips": []}
#     except Exception as e:
#         print(f"Error reading cache: {e}")
#         return {"timestamp": None, "connected_ips": []}


# def get_current_network():
#     addrs = psutil.net_if_addrs()
#     for interface, addr_list in addrs.items():
#         for addr in addr_list:
#             if addr.family == socket.AF_INET:
#                 ip = addr.address
#                 netmask = addr.netmask
#                 network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
#                 print(str(network))
#     return None

# async def ping_ip(ip):
#     system_name = platform.system()
#     if system_name == "Windows":
#         cmd = f"ping -n 1 -w 1000 {ip}"
#     else:
#         cmd = f"ping -c 1 -W 1 {ip}"
#     proc = await asyncio.create_subprocess_shell(
#         cmd,
#         stdout=asyncio.subprocess.DEVNULL,
#         stderr=asyncio.subprocess.DEVNULL
#     )
#     await proc.communicate()
#     return ip if proc.returncode == 0 else None

# def scan_subnet(network_cidr):
#     network = ipaddress.IPv4Network(network_cidr)
#     ips = [str(ip) for ip in network.hosts()]  # Generate all usable IPs
#     tasks = [ping_ip(ip) for ip in ips]
#     results = asyncio.gather(*tasks)
#     active_ips = [ip for ip in results if ip is not None]
#     return active_ips

def safe_ip_to_int(ip):
    try:
        return int(ipaddress.IPv4Address(ip))
    except ValueError:
        return None  # or handle as needed

# Read the excel with the devices info
def get_devices_info():
    df = pd.read_excel('ips_monitoring/ips_list.xlsx')
    df['ip_int'] = df['verificat VPN'].apply(safe_ip_to_int)
    df = df.sort_values(by='ip_int')
    df = df.drop(columns=['ip_int'])

    # Initialize network active column
    df['network active'] = False
    df.loc[df['OS'] == 'Win10_PRO', 'network active'] = True

    # Get connected IPs from cache
    # cache_data = read_connected_ips_cache()
    # connected_ips = cache_data["connected_ips"]
    
    # # Update network active status if we have data
    # if connected_ips:
    #     df['network active'] = df['verificat VPN'].isin(connected_ips)
        
    #     # Add missing IPs to DataFrame
    #     missing_ips = set(connected_ips) - set(df['verificat VPN'])
    #     for ip in missing_ips:
    #         new_row = {
    #             'verificat VPN': ip,
    #             'network active': True
    #         }
    #         df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

    data = df.where(pd.notnull(df), None).to_dict(orient='records')
    return data

# def download_sharepoint_list():
#     SITE_URL = os.getenv("IPS_MONITORING_SITE_URL")
    
#     print("SharePoint Connection Diagnostics")
#     print("=" * 40)
    
#     # Get credentials
#     username = os.getenv("SMTP_USERNAME")
#     password = os.getenv("SMTP_PASSWORD")
    
#     print(f"\n🔍 Testing connection to: {SITE_URL}")
#     print(f"👤 User: {username}")
    
#     try:
#         # Step 1: Test basic connection
#         print("\n1️⃣ Testing authentication...")
#         credentials = UserCredential(username, password)
#         ctx = ClientContext(SITE_URL).with_credentials(credentials)
        
#         # Step 2: Test web access
#         print("2️⃣ Testing web access...")
#         web = ctx.web
#         ctx.load(web)
#         ctx.execute_query()
        
#         print(f"✅ Successfully connected!")
#         print(f"📍 Site Title: {web.properties.get('Title', 'Unknown')}")
#         print(f"🌐 Site URL: {web.properties.get('Url', 'Unknown')}")
        
#         # Step 3: Test lists access
#         print("\n3️⃣ Testing lists access...")
#         lists = ctx.web.lists
#         ctx.load(lists)
#         ctx.execute_query()
        
#         print(f"✅ Found {len(lists)} total lists")
        
#         # Step 4: Show visible lists
#         print("\n4️⃣ Visible lists:")
#         visible_lists = []
#         for lst in lists:
#             try:
#                 list_title = lst.properties.get('Title', 'Unknown')
#                 list_hidden = lst.properties.get('Hidden', True)
#                 item_count = lst.properties.get('ItemCount', 0)
                
#                 if not list_hidden:
#                     visible_lists.append({
#                         'title': list_title,
#                         'count': item_count,
#                         'object': lst
#                     })
#                     print(f"   📋 {list_title} ({item_count} items)")
#             except Exception as e:
#                 print(f"   ⚠️ Error reading list: {e}")
        
#         if not visible_lists:
#             print("   ❌ No visible lists found")
#             return
        
#         # Step 5: Try to download from first list
#         print(f"\n5️⃣ Testing download from first list...")
#         test_list = visible_lists[0]
        
#         try:
#             items = test_list['object'].items
#             ctx.load(items)
#             ctx.execute_query()
            
#             print(f"✅ Successfully accessed list: {test_list['title']}")
#             print(f"📊 Items retrieved: {len(items)}")
            
#             if len(items) > 0:
#                 # Convert to DataFrame
#                 data = []
#                 for item in items:
#                     data.append(dict(item.properties))
                
#                 df = pd.DataFrame(data)
#                 print(f"📋 Columns found: {len(df.columns)}")
#                 print(f"🔤 Sample columns: {list(df.columns)[:5]}")
                
#                 # Save test file
#                 output_file = f"./test_{test_list['title'].replace(' ', '_')}.xlsx"
                
#                 # Clean columns
#                 clean_cols = [col for col in df.columns if not col.startswith('__')]
#                 df_clean = df[clean_cols]
                
#                 os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
#                 df_clean.to_excel(output_file, index=False)
                
#                 print(f"✅ Test file saved: {output_file}")
                
#         except Exception as e:
#             print(f"❌ Error accessing list items: {e}")
        
#     except Exception as e:
#         print(f"❌ Connection failed: {e}")
        
#         # Provide specific troubleshooting
#         error_str = str(e).lower()
        
#         if "syntax error" in error_str:
#             print("\n🔧 This looks like an authentication format issue:")
#             print("   - Try using your full email address (user@steinelde.com)")
#             print("   - Check if your password contains special characters")
#             print("   - Try without any spaces in username")
            
#         elif "unauthorized" in error_str or "401" in error_str:
#             print("\n🔧 Authentication failed:")
#             print("   - Double-check your username and password")
#             print("   - Try logging into SharePoint web interface first")
#             print("   - Check if MFA is enabled (you may need an app password)")
            
#         elif "forbidden" in error_str or "403" in error_str:
#             print("\n🔧 Access denied:")
#             print("   - You may not have permission to this SharePoint site")
#             print("   - Contact your IT admin to grant access")
            
#         elif "not found" in error_str or "404" in error_str:
#             print("\n🔧 Site not found:")
#             print("   - Check if the SharePoint URL is correct")
#             print("   - Verify the site exists and you have access")

# def run_ips_monitoring_refresh():
#     print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Running ips_monitoring refresh!")
#     result = download_sharepoint_list()
#     return result


# if __name__ == "__main__":
#     current_network = get_current_network()
#     print(current_network)
#     print(scan_network("10.29.165.0/24"))