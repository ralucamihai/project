import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

# Email configuration
EMAIL_CONFIG = {
    'smtp_server': os.getenv("SMTP_SERVER"),
    'smtp_port': os.getenv("SMTP_PORT"),
    # 'smtp_username':  os.getenv("SMTP_USERNAME"),
    # 'smtp_password':  os.getenv("SMTP_PASSWORD"),
    'from_email':  os.getenv("FROM_EMAIL"),
    'company_name':  os.getenv("COMPANY_NAME"),
    'base_url':  os.getenv("BASE_URL"),
    'support_email':  os.getenv("SUPPORT_EMAIL")
}

admin_emails_str = os.getenv("ADMIN_EMAILS")
ADMIN_EMAILS = [email.strip() for email in admin_emails_str.split(',') if email.strip()]
ADMIN_NOTIFICATION_TEMPLATE_FILE_NAME = os.getenv("ADMIN_NOTIFICATION_TEMPLATE_FILE_NAME")
USER_REGISTER_NOTIFICATION_TEMPLATE_FILE_NAME = os.getenv("USER_REGISTER_NOTIFICATION_TEMPLATE_FILE_NAME")
USER_PASSWORD_FORGOT_TEMPLATE_FILE_NAME = os.getenv("USER_PASSWORD_FORGOT_TEMPLATE_FILE_NAME")

def send_admin_notification_email(user_data):
    """
    Send notification email to admin(s) when a new user registers
    
    Args:
        user_data (dict): User information
        email_config (dict): Email configuration
        admin_emails (list): List of admin email addresses
    """
    
    try:
        with open(ADMIN_NOTIFICATION_TEMPLATE_FILE_NAME, 'r', encoding='utf-8') as file:
            template_content = file.read()
    except FileNotFoundError:
        print(f"Template file {ADMIN_NOTIFICATION_TEMPLATE_FILE_NAME} not found")
        return False
    
    # Create Jinja2 template
    template = Template(template_content)
    
    # Prepare template data
    base_url = EMAIL_CONFIG.get('base_url', 'http://10.60.10.71/#/')
    
    template_data = {
        'first_name': user_data.get('firstName', ''),
        'last_name': user_data.get('lastName', ''),
        'username': user_data.get('username', ''),
        'email': user_data.get('email', ''),
        'employee_no': user_data.get('employeeNo', ''),
        'role': user_data.get('role', '').title(),
        'created_date': datetime.now().strftime('%B %d, %Y at %I:%M %p'),
        'current_year': datetime.now().year,
        'company_name': EMAIL_CONFIG.get('company_name', 'Steinel PMB'),
        'approve_url': f"{base_url}/user_management",
        'reject_url': f"{base_url}/user_management",
        'admin_panel_url': f"{base_url}/user_management"
    }
    
    # Render the template
    html_content = template.render(**template_data)
    
    # Create plain text version (fallback)
    text_content = f"""
    NEW USER REGISTRATION - ACTION REQUIRED
    
    A new user has registered and requires approval:
    
    User Details:
    - Name: {template_data['first_name']} {template_data['last_name']}
    - Username: {template_data['username']}
    - Email: {template_data['email']}
    - Employee ID: {template_data['employee_no']}
    - Requested Role: {template_data['role']}
    - Registration Date: {template_data['created_date']}
    
    Actions:
    - Approve: {template_data['approve_url']}
    - Reject: {template_data['reject_url']}
    - Admin Panel: {template_data['admin_panel_url']}
    
    Please review and take appropriate action.
    
    {template_data['company_name']} Admin System
    """
    
    # Send to all admin emails
    success_count = 0
    for admin_email in ADMIN_EMAILS:
        try:
            # Create email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🚨 New User Registration - Approval Required | {template_data['company_name']}"
            msg['From'] = EMAIL_CONFIG['from_email']
            msg['To'] = admin_email
            
            # Attach parts
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
            # server.starttls()
            # server.login(EMAIL_CONFIG['smtp_username'], EMAIL_CONFIG['smtp_password'])
            
            text = msg.as_string()
            server.sendmail(EMAIL_CONFIG['from_email'], admin_email, text)
            server.quit()
            
            print(f"Admin notification sent successfully to {admin_email}")
            success_count += 1
            
        except Exception as e:
            print(f"Error sending admin email to {admin_email}: {e}")
    
    return success_count > 0

def send_account_created_email(user_data):
    """
    Send an account creation pending approval email to the user.
    
    Args:
        user_data (dict): User info with keys: first_name, last_name, username, email, employee_no, role, created_date
        email_config (dict): SMTP and sender info
        support_email (str): Support email address
        login_url (str): URL for user login after approval
    """
    try:
        with open(USER_REGISTER_NOTIFICATION_TEMPLATE_FILE_NAME, 'r', encoding='utf-8') as file:
            template_content = file.read()
    except FileNotFoundError:
        print(f"Template file {USER_REGISTER_NOTIFICATION_TEMPLATE_FILE_NAME} not found")
        return False
    
    # Create Jinja2 template
    template = Template(template_content)
    
    # Prepare template data
    base_url = EMAIL_CONFIG.get('base_url', 'http://10.60.10.71/#/')

    # Prepare data for rendering
    current_year = datetime.now().year
    rendered_html = template.render(
        first_name=user_data.get('firstName', ''),
        last_name=user_data.get('lastName', ''),
        username=user_data.get('username', ''),
        email=user_data.get('email', ''),
        employee_no=user_data.get('employeeNo', ''),
        role=user_data.get('role', ''),
        created_date=datetime.now().strftime('%B %d, %Y at %I:%M %p'),
        company_name=EMAIL_CONFIG.get('company_name', 'Your Company'),
        login_url=f"{base_url}/login",
        current_year=current_year
    )
    
    # Create email message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Account Created - Pending Approval | {EMAIL_CONFIG.get('company_name', 'Your Company')}"
    msg['From'] = EMAIL_CONFIG['from_email']
    msg['To'] = user_data['email']
    
    # Attach HTML content
    part_html = MIMEText(rendered_html, 'html')
    msg.attach(part_html)
    
    # Send email
    try:
        server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
        # server.starttls()
        # server.login(EMAIL_CONFIG['smtp_username'], EMAIL_CONFIG['smtp_password'])
        server.sendmail(EMAIL_CONFIG['from_email'], user_data['email'], msg.as_string())
        server.quit()
        print(f"Account creation email sent to {user_data['email']}")
    except Exception as e:
        print(f"Error sending email: {e}")

def send_user_password_email(user_data):
    try:
        with open(USER_PASSWORD_FORGOT_TEMPLATE_FILE_NAME, 'r', encoding='utf-8') as file:
            template_content = file.read()
    except FileNotFoundError:
        print(f"Template file {USER_PASSWORD_FORGOT_TEMPLATE_FILE_NAME} not found")
        return False
    
    # Create Jinja2 template
    template = Template(template_content)
    
    # Prepare template data
    base_url = EMAIL_CONFIG.get('base_url', 'http://10.60.10.71/#/')

    # Render the email content
    rendered_html = template.render(
        first_name=user_data.get('firstName', ''),
        last_name=user_data.get('lastName', ''),
        new_password=user_data.get('newPassword', ''),
        current_year=datetime.now().year,
        company_name=EMAIL_CONFIG.get('company_name', 'Your Company'),
    )

    # Create email message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Forgot Password - Password Reset | {EMAIL_CONFIG.get('company_name', 'Your Company')}"
    msg['From'] = EMAIL_CONFIG['from_email']
    msg['To'] = user_data['email']
    
    # Attach HTML content
    part_html = MIMEText(rendered_html, 'html')
    msg.attach(part_html)
    
    # Send email
    try:
        server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
        # server.starttls()
        # server.login(EMAIL_CONFIG['smtp_username'], EMAIL_CONFIG['smtp_password'])
        server.sendmail(EMAIL_CONFIG['from_email'], user_data['email'], msg.as_string())
        server.quit()
        print(f"Password reset email sent to {user_data['email']}")
    except Exception as e:
        print(f"Error sending email: {e}")



# test_user = {
#     'firstName': 'John',
#     'lastName': 'Doe',
#     'username': 'johndoe',
#     'email': 'john.doe@example.com',
#     'employeeNo': 'EMP001',
#     'role': 'user'
# }

# success = send_admin_notification_email(test_user, EMAIL_CONFIG, ADMIN_EMAILS)