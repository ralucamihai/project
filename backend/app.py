import asyncio
from datetime import datetime
import os
import traceback
from typing import List, Optional

# Importuri module proprii
from nomenclature.main import *
from maintenance.main import *
from ips_monitoring.main import *
from pmb_dashboard.main import *
from login.main import *
from configurations.main import *
from customer_support.main import *

from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    BackgroundTasks,
    HTTPException,
    Depends,
    Query,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

VERSION = os.getenv("VERSION", "dev")
BUILD = os.getenv("BUILD", "local")

# Referință către Event Loop-ul principal FastAPI pentru operațiuni asincrone din alte thread-uri
_main_loop = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    create_tables()   # <-- adaugat: creeaza orice tabela lipsa, e idempotent
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan)

# --- CORS -------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://10.60.10.71:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------------------------------------------------


# --- Global exception handler -------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("=" * 80)
    print(f"UNHANDLED EXCEPTION on {request.method} {request.url}")
    traceback.print_exc()
    print("=" * 80)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )
# -----------------------------------------------------------------------

# Store connected WebSocket clients
clients: List[WebSocket] = []


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await broadcast(data)
    except WebSocketDisconnect:
        if websocket in clients:
            clients.remove(websocket)
    except Exception:
        if websocket in clients:
            clients.remove(websocket)


def trigger_broadcast(message: str):
    """Trimite mesaje din thread-uri sincrone (APScheduler/BackgroundTasks) în mod sigur către Event Loop."""
    if _main_loop and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(broadcast(message), _main_loop)
    else:
        try:
            asyncio.run(broadcast(message))
        except Exception as e:
            print(f"Error in trigger_broadcast: {e}")


async def broadcast(message: str):
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Sending broadcast message: {message}!"
    )
    for client in list(clients):
        try:
            await client.send_text(message)
        except Exception:
            # În caz de deconectare neașteptată a unui client
            if client in clients:
                clients.remove(client)


@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI backend!"}


@app.get("/api/get_devices_info")
def get_devices_info_api():
    data = get_devices_info()
    return data


@app.get("/api/get_guide_text")
def get_guide_text():
    return read_guide_text()


@app.put("/api/put_guide_text")
async def update_guide_text(guide_data: GuideTextUpdate):
    try:
        text_content = guide_data.text.strip()

        if not text_content:
            raise HTTPException(status_code=400, detail="Text content cannot be empty")

        success = write_guide_text(text_content)

        if success:
            await broadcast("guide_text_data_updated")
            return {"message": "Guide text updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update guide text")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/api/get_global_lp_data")
def get_global_lp_data(
    startDate: Optional[str] = Query(
        None, description="Filter by start date (YYYY-MM-DD format)"
    ),
    endDate: Optional[str] = Query(
        None, description="Filter by end date (YYYY-MM-DD format)"
    ),
    productCode: Optional[str] = Query(None, description="Filter by product code"),
):
    conn = get_connection()
    try:
        cur = conn.cursor()

        query = """
            SELECT
                date as "Date",
                product_code as "Product Code",
                description as "Description",
                order_id as "Order",
                0 as "Order QTY",
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
                status as "Status"
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
        return data
    finally:
        conn.close()


@app.get("/api/get_pmb_dashboard_available_dates")
def get_availabe_dates():
    return get_pmb_dashboard_available_dates_db()


@app.get("/api/get_pmb_dashboard_available_product_codes")
def get_available_product_codes():
    return get_pmb_dashboard_available_product_codes_db()


@app.get("/api/get_pmb_dashboard_limits")
def get_pmb_dashboard_limits():
    result = {
        "fpy_interval_high": FPY_INTERVAL_HIGH,
        "fpy_interval_low": FPY_INTERVAL_LOW,
        "spy_interval_high": SPY_INTERVAL_HIGH,
        "spy_interval_low": SPY_INTERVAL_LOW,
    }

    return result


@app.get("/api/environment_version")
def get_environment_version():
    result = {"version": VERSION, "build": BUILD}

    return result


@app.get("/api/specific_dat_file")
async def get_specific_dat(filename: str):
    result = await get_specific_dat_file(filename)

    return result


# ============================================================================
# USER MANAGEMENT & AUTHENTICATION
# ============================================================================

@app.post("/api/register")
async def register(
    user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    background_tasks.add_task(trigger_broadcast, "user_management_data_updated")
    return register_new_user(user, db)


@app.post("/api/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    try:
        return login_for_access_token(form_data, db)
    except HTTPException:
        raise
    except Exception as e:
        print("=" * 80)
        print("EROARE NECONTROLATĂ la /api/token:")
        traceback.print_exc()
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@app.get("/debug/user/{username}")
def debug_user(username: str, db: Session = Depends(get_db)):
    user = get_user(db, username)
    if user:
        return {
            "found": True,
            "username": user.username,
            "status": user.status,
            "has_password": bool(user.password_hash),
        }
    return {"found": False}


@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = get_all_users(
        db,
        ["firstName", "lastName", "username", "email", "employeeNo", "role", "status"],
    )
    return {"users": users}


@app.get("/api/user")
def get_current_user_endpoint(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user:
        user_dict = current_user.__dict__.copy()
        user_dict.pop("password_hash", None)
        return user_dict
    return current_user.username


@app.get("/api/all_users")
def get_all_users_endpoint(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    all_users = get_all_users_with_credentials(token, db)
    return all_users


@app.post("/api/approve_user")
async def approve_user_endpoint(
    user: UserApprove,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    approved_user = approve_user_with_credentials(user=user, token=token, db=db)
    if approved_user:
        await broadcast("user_management_data_updated")
    return approved_user


@app.post("/api/reset_password")
def reset_password(
    userResetPassword: UserResetPassword,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = reset_password_with_credentials(
        userResetPassword=userResetPassword, token=token, db=db
    )
    return user


@app.post("/api/update_user_info")
async def update_user_info_endpoint(
    updateUserInfo: UserUpdateInfo,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    updated_user = update_user_info_with_credentials(
        updateUserInfo=updateUserInfo, token=token, db=db
    )
    if updated_user:
        await broadcast("user_management_data_updated")
    return updated_user


@app.post("/api/forgot_password")
def forgot_pass(email: UserForgotPassword, db: Session = Depends(get_db)):
    forgot_password(email, db)


# ============================================================================
# CUSTOMER SUPPORT: TICKETS
# ============================================================================

@app.get("/api/customer_support/tickets")
def get_tickets_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_tickets(db)


@app.post("/api/customer_support/tickets")
def create_ticket_api(
    payload: TicketCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)
    return create_ticket(db, payload, initiator=user.username, termen_initiat=datetime.now())


@app.put("/api/customer_support/tickets")
def update_ticket_api(
    payload: TicketUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = update_ticket(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Ticket inexistent.")
    return result


@app.delete("/api/customer_support/tickets/{ticket_id}")
def delete_ticket_api(
    ticket_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    ok = delete_ticket(db, ticket_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ticket inexistent.")
    return {"message": "Ticket șters."}


# ============================================================================
# BACKGROUND SCHEDULER: PMB DASHBOARD
# ============================================================================

def run_pmb_dashboard_refresh_ws():
    updated = run_pmb_dashboard_refresh()
    if updated:
        trigger_broadcast("pmb_dashboard_data_updated")


scheduler = BackgroundScheduler()
scheduler.add_job(
    run_pmb_dashboard_refresh_ws,
    args=[],
    max_instances=1,
    trigger="interval",
    minutes=int(PMB_DASHBOARD_CACHE_REFRESH_INTERVAL_MINUTES),
    next_run_time=datetime.now(),
)


# ============================================================================
# MENTENANȚĂ: ECHIPAMENTE
# ============================================================================

@app.get("/api/maintenance/echipamente", response_model=List[EchipamentResponse])
def get_echipamente_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_echipamente(db)


@app.post("/api/maintenance/echipamente", response_model=EchipamentResponse)
def create_echipament_api(payload: EchipamentSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_echipament(db, payload)


@app.put("/api/maintenance/echipamente/{echipament_id}", response_model=EchipamentResponse)
def update_echipament_api(echipament_id: int, payload: EchipamentSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_echipament(db, echipament_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Echipament inexistent.")
    return result


@app.delete("/api/maintenance/echipamente/{echipament_id}")
def delete_echipament_api(echipament_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    if not delete_echipament(db, echipament_id):
        raise HTTPException(status_code=404, detail="Echipament inexistent.")
    return {"message": "Echipament șters."}


# ============================================================================
# MENTENANȚĂ: ACTIVITĂȚI PMB
# ============================================================================

@app.get("/api/maintenance/activitati", response_model=List[ActivitateResponse])
def get_activitati_api(
    tipInterventie: Optional[str] = None,
    status: Optional[str] = None,
    activ: Optional[bool] = None,
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    get_current_user(token, db)
    return get_all_activitati(db, tipInterventie, status, activ)


@app.post("/api/maintenance/activitati", response_model=ActivitateResponse)
def create_activitate_api(payload: ActivitateSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_activitate(db, payload)


@app.put("/api/maintenance/activitati/{activitate_id}", response_model=ActivitateResponse)
def update_activitate_api(activitate_id: int, payload: ActivitateSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_activitate(db, activitate_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Activitate inexistentă.")
    return result


@app.put("/api/maintenance/activitati/{activitate_id}/detalii")
def update_detalii_activitate_api(activitate_id: int, payload: dict, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_detalii_activitate(db, activitate_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Activitate inexistentă.")
    return result


@app.delete("/api/maintenance/activitati/{activitate_id}")
def delete_activitate_api(activitate_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    if not delete_activitate(db, activitate_id):
        raise HTTPException(status_code=404, detail="Activitate inexistentă.")
    return {"message": "Activitate ștearsă."}


# ============================================================================
# ENDPOINT-URI NOMENCLATOR (Pentru listele tip dropdown)
# ============================================================================

@app.get("/api/nomenclature/tip_interventie")
def get_nom_tip_interventie(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return [
        "Accidentala", "AEM", "Ajustare parametrii", "Backup", "Cladiri",
        "Curatare_echip", "Electric", "Electrosecuritate", "ESD", "Imbunatatire",
        "Instalare Echipament", "Masuratoare", "Pneumatic", "Pornire_fabricatie",
        "Predictiva", "Prelucrare mecanica repere", "Preventiva", "Produs_nou",
        "Reglaj echipament", "Reglaj stanta", "Schimb_echip", "Schimb_produs",
        "Schimb_recipient", "Schimb_stanta"
    ]


@app.get("/api/nomenclature/categorie_defect")
def get_nom_categorie_defect(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return [
        "Uzura garnitura", "Eroare senzor", "Defect electric", 
        "Defect mecanic", "Scurgere ulei", "Vibratii anormale",
        "Defect de produs", "Eroare operator", "Defect software"
    ]


@app.get("/api/nomenclature/tip_echipament")
def get_nom_tip_echipament(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return ["Cabina", "Dispozitiv", "Echipament", "Electro securitate", "ESD punct de măsurare"]


# ============================================================================
# NOMENCLATOR: UTILIZATORI PMB & GRUPURI DE MUNCA
# ============================================================================

@app.get("/api/nomenclature/utilizatori_pmb")
def get_utilizatori_pmb_api(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    get_current_user(token, db)
    return get_all_utilizatori_pmb(db)


@app.post("/api/nomenclature/utilizatori_pmb")
def create_utilizator_pmb_api(
    payload: UtilizatorPMBCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    return create_utilizator_pmb(db, payload)


@app.put("/api/nomenclature/utilizatori_pmb")
def update_utilizator_pmb_api(
    payload: UtilizatorPMBUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = update_utilizator_pmb(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return result


@app.delete("/api/nomenclature/utilizatori_pmb/{utilizator_id}")
def delete_utilizator_pmb_api(
    utilizator_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    ok = delete_utilizator_pmb(db, utilizator_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return {"message": "Utilizator șters."}


@app.post("/api/nomenclature/utilizatori_pmb/{utilizator_id}/toggle_activ")
def toggle_activ_utilizator_pmb_api(
    utilizator_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = toggle_activ_utilizator_pmb(db, utilizator_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return result


@app.get("/api/nomenclature/grupuri_munca")
def get_grupuri_munca_api(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    get_current_user(token, db)
    return get_grupuri_munca(db)


@app.post("/api/nomenclature/grupuri_munca")
def create_grup_munca_api(
    payload: GrupMuncaCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = create_grup_munca(db, payload)
    if result is None:
        raise HTTPException(status_code=400, detail="Numele grupului este obligatoriu.")
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja un grup cu acest nume.")
    return result


# ============================================================================
# NOMENCLATOR: PIESE & LISTE DE PIESE
# ============================================================================

@app.get("/api/nomenclature/piese")
def get_piese_api(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    get_current_user(token, db)
    return get_all_piese(db)


@app.post("/api/nomenclature/piese")
def create_piesa_api(
    payload: PiesaCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    return create_piesa(db, payload)


@app.put("/api/nomenclature/piese")
def update_piesa_api(
    payload: PiesaUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = update_piesa(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Piesa inexistenta.")
    return result


@app.delete("/api/nomenclature/piese/{piesa_id}")
def delete_piesa_api(
    piesa_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    ok = delete_piesa(db, piesa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Piesa inexistenta.")
    return {"message": "Piesa stearsa."}


@app.get("/api/nomenclature/liste_piese")
def get_liste_piese_api(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    get_current_user(token, db)
    return get_all_liste_piese(db)


@app.post("/api/nomenclature/liste_piese")
def create_lista_piese_api(
    payload: ListaPieseCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    return create_lista_piese(db, payload)


@app.put("/api/nomenclature/liste_piese")
def update_lista_piese_api(
    payload: ListaPieseUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = update_lista_piese(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista inexistenta.")
    return result


@app.delete("/api/nomenclature/liste_piese/{lista_id}")
def delete_lista_piese_api(
    lista_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    ok = delete_lista_piese(db, lista_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lista inexistenta.")
    return {"message": "Lista stearsa."}


@app.post("/api/nomenclature/liste_piese/{lista_id}/adauga_piesa/{piesa_id}")
def adauga_piesa_in_lista_api(
    lista_id: int,
    piesa_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = adauga_piesa_in_lista(db, lista_id, piesa_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau piesa inexistenta.")
    return result


@app.post("/api/nomenclature/liste_piese/{lista_id}/scoate_piesa/{piesa_id}")
def scoate_piesa_din_lista_api(
    lista_id: int,
    piesa_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    get_current_user(token, db)
    result = scoate_piesa_din_lista(db, lista_id, piesa_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau piesa inexistenta.")
    return result