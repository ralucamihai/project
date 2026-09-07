import requests
from datetime import datetime

def send_ticket_email(ticket_data: dict, email_destinatar: str):
    if not email_destinatar:
        print("⚠ Ticket creat, dar responsabilul nu are email valid in DB.")
        return

    data_trimitere = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    
    rand_grup = f"<tr><td style='background-color: #f4f5f7;'><b>Grup intervenție:</b></td><td>{ticket_data.get('grup')}</td></tr>" if ticket_data.get('grup') else ""
    rand_responsabil = f"<tr><td style='background-color: #f4f5f7;'><b>Responsabil:</b></td><td>{ticket_data.get('responsabil')}</td></tr>" if ticket_data.get('responsabil') else ""
    nr_inventar = ticket_data.get('tipEchipament', ticket_data.get('codAfectat', '-'))

    html_body = f"""
    <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.5;">
            <div style="background-color: #fdfdfd; padding: 12px 15px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
                <p style="margin: 4px 0;"><b>From:</b> PMB Dashboard &lt;pmbdonotreply@gmail.com&gt;</p>
                <p style="margin: 4px 0;"><b>Sent:</b> {data_trimitere}</p>
                <p style="margin: 4px 0;"><b>To:</b> {email_destinatar}</p>
            </div>
            <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; border-color: #ddd; width: 100%; max-width: 600px; font-size: 14px;">
                <tr><td style="background-color: #f4f5f7; width: 35%;"><b>Mesaj de la:</b></td><td>{ticket_data.get('initiator', '-')}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>La data:</b></td><td>{ticket_data.get('termenInitiat', '-')}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>Secția:</b></td><td>{ticket_data.get('sectie', '-')}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>Linia:</b></td><td>{ticket_data.get('linie', '-')}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>Nr. inventar echipament:</b></td><td>{nr_inventar}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>Denumire echipament:</b></td><td>{ticket_data.get('echipa', '-')}</td></tr>
                <tr><td style="background-color: #f4f5f7;"><b>Tip intervenție:</b></td><td>{ticket_data.get('tipInterventie', '-')}</td></tr>
                {rand_grup}
                {rand_responsabil}
                <tr><td style="background-color: #f4f5f7;"><b>Descriere simptom:</b></td><td style="color: #c0332f; font-weight: bold;">{ticket_data.get('descriereSimptom', '-')}</td></tr>
            </table>
            <br>
            <p>Accesează <a href="http://localhost:4200/#/customer_support?tab=tickets" style="color: #1a5fc4; font-weight: bold; text-decoration: none;">PMB Dashboard</a> pentru a prelua ticketul.</p>
        </body>
    </html>
    """

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": "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",
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": "PMB", "email": "pmbdonotreply@gmail.com"},
        "to": [{"email": email_destinatar}],
        "subject": f"🎫 Ticket PMB Nou: {ticket_data.get('echipa', 'Fără Echipament')} - Prioritate {ticket_data.get('prioritate', 'Medie')}",
        "htmlContent": html_body
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201, 202]:
            print(f"✅ Email trimis cu succes prin Cloud API către: {email_destinatar}")
        else:
            print(f"❌ Eroare API Cloud: {response.text}")
    except Exception as e:
        print(f"❌ Eroare de rețea la trimiterea prin API: {e}")