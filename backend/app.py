import asyncio
from datetime import datetime
import os
import traceback
from types import SimpleNamespace
from typing import List, Optional

# Import DB engine & Base pentru crearea tabelelor
from database import engine, Base, get_db

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
from sqlalchemy import text

VERSION = os.getenv("VERSION", "dev")
BUILD = os.getenv("BUILD", "local")

_main_loop = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    
    # Creează automat toate tabelele definite în modele (inclusiv nom_sectii)
    try:
        Base.metadata.create_all(bind=engine)
        print("(*) Schema de baza de date sincronizata (inclusiv nom_sectii).")
    except Exception as e:
        print(f"Eroare la Base.metadata.create_all: {e}")

    # --- AUTO-MIGRARE DIRECT PE BAZA DE DATE ACTIVĂ ---
    try:
        db = next(get_db())
        try:
            db.execute(text("SELECT centru_cost FROM cs_orders LIMIT 1;"))
        except Exception:
            db.rollback()
            print("(!) Tabela veche 'cs_orders' detectata. Se recreeaza automat cu noile coloane...")
            db.execute(text("DROP TABLE IF EXISTS cs_orders;"))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"Verificare schema cs_orders: {e}")

    # --- Auto-migrare pentru coloana 'functie' din tabela 'users' ---
    try:
        db = next(get_db())
        try:
            db.execute(text("SELECT functie FROM users LIMIT 1;"))
        except Exception:
            db.rollback()
            print("(!) Coloana 'functie' lipseste din 'users'. Se adauga automat...")
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN functie VARCHAR(50);"))
                db.commit()
            except Exception as e_col:
                db.rollback()
                print(f"    -> Eroare la adaugarea coloanei 'functie': {e_col}")
        finally:
            db.close()
    except Exception as e:
        print(f"Verificare schema users: {e}")

    # --- Auto-migrare pentru coloana 'grup' din tabela 'users' ---
    try:
        db = next(get_db())
        try:
            db.execute(text("SELECT grup FROM users LIMIT 1;"))
        except Exception:
            db.rollback()
            print("(!) Coloana 'grup' lipseste din 'users'. Se adauga automat...")
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN grup VARCHAR(100);"))
                db.commit()
            except Exception as e_col:
                db.rollback()
                print(f"    -> Eroare la adaugarea coloanei 'grup': {e_col}")
        finally:
            db.close()
    except Exception as e:
        print(f"Verificare schema users (grup): {e}")

    # --- Migrare aditiva: coloanele 'grup' si 'responsabil' pe cs_tickets ---
    try:
        create_tables()   # Creează orice tabelă veche/lipsă
    except Exception as e:
        print(f"Info create_tables: {e}")

    try:
        db = next(get_db())
        try:
            table_exists = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_name = 'cs_tickets');"
            )).scalar()

            if table_exists:
                try:
                    db.execute(text("SELECT grup, responsabil FROM cs_tickets LIMIT 1;"))
                except Exception:
                    db.rollback()
                    print("(!) Coloanele 'grup'/'responsabil' lipsesc din 'cs_tickets'. Se adauga automat...")
                    try:
                        db.execute(text("ALTER TABLE cs_tickets ADD COLUMN grup VARCHAR;"))
                        db.commit()
                    except Exception as e_col:
                        db.rollback()
                        print(f"    -> coloana 'grup': {e_col}")
                    try:
                        db.execute(text("ALTER TABLE cs_tickets ADD COLUMN responsabil VARCHAR;"))
                        db.commit()
                    except Exception as e_col:
                        db.rollback()
                        print(f"    -> coloana 'responsabil': {e_col}")
        finally:
            db.close()
    except Exception as e:
        print(f"Verificare schema cs_tickets: {e}")

    # --- Auto-migrare pentru coloana 'departament' din tabela 'nom_grupuri_munca' ---
    try:
        db = next(get_db())
        try:
            db.execute(text("SELECT departament FROM nom_grupuri_munca LIMIT 1;"))
        except Exception:
            db.rollback()
            print("(!) Coloana 'departament' lipseste din 'nom_grupuri_munca'. Se adauga automat...")
            try:
                db.execute(text("ALTER TABLE nom_grupuri_munca ADD COLUMN departament VARCHAR(50);"))
                db.commit()
            except Exception as e_col:
                db.rollback()
                print(f"    -> Eroare la adaugarea coloanei 'departament': {e_col}")
        finally:
            db.close()
    except Exception as e:
        print(f"Verificare schema nom_grupuri_munca: {e}")
        
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

# --- CORS -------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    startDate: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD format)"),
    endDate: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD format)"),
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
async def register(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    background_tasks.add_task(trigger_broadcast, "user_management_data_updated")
    return register_new_user(user, db)

@app.post("/api/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
async def approve_user_endpoint(user: UserApprove, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    approved_user = approve_user_with_credentials(user=user, token=token, db=db)
    if approved_user:
        await broadcast("user_management_data_updated")
    return approved_user

@app.post("/api/reset_password")
def reset_password(userResetPassword: UserResetPassword, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = reset_password_with_credentials(userResetPassword=userResetPassword, token=token, db=db)
    return user

@app.post("/api/update_user_info")
async def update_user_info_endpoint(updateUserInfo: UserUpdateInfo, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    updated_user = update_user_info_with_credentials(updateUserInfo=updateUserInfo, token=token, db=db)
    if updated_user:
        await broadcast("user_management_data_updated")
    return updated_user

@app.post("/api/forgot_password")
def forgot_pass(email: UserForgotPassword, db: Session = Depends(get_db)):
    forgot_password(email, db)

# ============================================================================
# CUSTOMER SUPPORT
# ============================================================================

@app.get("/api/customer_support/tickets")
def get_tickets_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_tickets(db)

@app.post("/api/customer_support/tickets")
def create_ticket_api(payload: TicketCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return create_ticket(db, payload, initiator=user.username, termen_initiat=datetime.now())

@app.put("/api/customer_support/tickets")
def update_ticket_api(payload: TicketUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_ticket(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Ticket inexistent.")
    return result

@app.delete("/api/customer_support/tickets/{ticket_id}")
def delete_ticket_api(ticket_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_ticket(db, ticket_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ticket inexistent.")
    return {"message": "Ticket șters."}

@app.get("/api/customer_support/orders")
def get_orders_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_orders(db)

@app.post("/api/customer_support/orders")
def create_order_api(payload: OrderCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return create_order(db, payload, current_username=user.username)

@app.put("/api/customer_support/orders")
def update_order_api(payload: OrderUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_order(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Comanda inexistentă.")
    return result

@app.delete("/api/customer_support/orders/{order_id}")
def delete_order_api(order_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_order(db, order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Comanda inexistentă.")
    return {"message": "Comandă ștearsă."}

@app.get("/api/customer_support/suggestions")
def get_suggestions_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_suggestions(db)

@app.post("/api/customer_support/suggestions")
def create_suggestion_api(payload: dict, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_suggestion(db, SimpleNamespace(**payload))

@app.put("/api/customer_support/suggestions")
def update_suggestion_api(payload: dict, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_suggestion(db, SimpleNamespace(**payload))
    if result is None:
        raise HTTPException(status_code=404, detail="Sugestie inexistentă.")
    return result

@app.delete("/api/customer_support/suggestions/{suggestion_id}")
def delete_suggestion_api(suggestion_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_suggestion(db, suggestion_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Sugestie inexistentă.")
    return {"message": "Sugestie ștearsă."}

@app.get("/api/customer_support/complaints")
def get_complaints_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_complaints(db)

@app.post("/api/customer_support/complaints")
def create_complaint_api(payload: dict, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_complaint(db, SimpleNamespace(**payload))

@app.put("/api/customer_support/complaints")
def update_complaint_api(payload: dict, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_complaint(db, SimpleNamespace(**payload))
    if result is None:
        raise HTTPException(status_code=404, detail="Reclamație inexistentă.")
    return result

@app.delete("/api/customer_support/complaints/{complaint_id}")
def delete_complaint_api(complaint_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_complaint(db, complaint_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Reclamație inexistentă.")
    return {"message": "Reclamație ștearsă."}

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
# MENTENANȚĂ
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
    # Dropdown legacy (folosit in Mentenanta) - citeste acum din tabela reala,
    # ca sa ramana sincronizat cu ce se administreaza in Nomenclator > Tip Intervenție.
    get_current_user(token, db)
    return [t["denumire"] for t in get_all_tip_interventie(db)]

@app.get("/api/nomenclature/categorie_defect")
def get_nom_categorie_defect(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Dropdown legacy (folosit in Mentenanta) - citeste acum din tabela reala,
    # ca sa ramana sincronizat cu ce se administreaza in Nomenclator > Categorie Defect.
    get_current_user(token, db)
    return [c["denumire"] for c in get_all_categorii_defect(db)]

# ============================================================================
# NOMENCLATOR
# ============================================================================

@app.get("/api/nomenclature/tip_echipament", response_model=List[TipEchipamentResponse])
def get_tipuri_echipamente_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_tipuri_echipament(db)

@app.post("/api/nomenclature/tip_echipament", response_model=TipEchipamentResponse)
def create_tip_echipament_api(payload: TipEchipamentSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_tip_echipament(db, payload)

@app.put("/api/nomenclature/tip_echipament/{tip_id}", response_model=TipEchipamentResponse)
def update_tip_echipament_api(tip_id: int, payload: TipEchipamentSchema, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_tip_echipament(db, tip_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Șablonul de echipament nu a fost găsit.")
    return result

@app.delete("/api/nomenclature/tip_echipament/{tip_id}")
def delete_tip_echipament_api(tip_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_tip_echipament(db, tip_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Șablonul de echipament nu a fost găsit.")
    return {"message": "Șablon șters cu succes."}

# ---- TIP INTERVENȚIE (CRUD real, conectat la baza de date) ----

@app.get("/api/nomenclature/tipuri_interventie")
def get_tipuri_interventie_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_tip_interventie(db)

@app.post("/api/nomenclature/tipuri_interventie")
def create_tip_interventie_api(payload: TipInterventieCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = create_tip_interventie(db, payload)
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja un tip de intervenție cu această denumire.")
    return result

@app.put("/api/nomenclature/tipuri_interventie")
def update_tip_interventie_api(payload: TipInterventieUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_tip_interventie(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Tip de intervenție inexistent.")
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja un tip de intervenție cu această denumire.")
    return result

@app.delete("/api/nomenclature/tipuri_interventie/{tip_interventie_id}")
def delete_tip_interventie_api(tip_interventie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_tip_interventie(db, tip_interventie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tip de intervenție inexistent.")
    return {"message": "Tip de intervenție șters."}

# ---- CATEGORIE DEFECT (CRUD real, conectat la baza de date) ----

@app.get("/api/nomenclature/categorii_defect")
def get_categorii_defect_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_categorii_defect(db)

@app.post("/api/nomenclature/categorii_defect")
def create_categorie_defect_api(payload: CategorieDefectCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = create_categorie_defect(db, payload)
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja o categorie cu acest ID.")
    return result

@app.put("/api/nomenclature/categorii_defect")
def update_categorie_defect_api(payload: CategorieDefectUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_categorie_defect(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Categorie inexistentă.")
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja o categorie cu acest ID.")
    return result

@app.delete("/api/nomenclature/categorii_defect/{categorie_id}")
def delete_categorie_defect_api(categorie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_categorie_defect(db, categorie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Categorie inexistentă.")
    return {"message": "Categorie ștearsă."}

# ---- OPERAȚII (CRUD real, conectat la baza de date) ----

@app.get("/api/nomenclature/operatii")
def get_operatii_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_operatii(db)

@app.post("/api/nomenclature/operatii")
def create_operatie_api(payload: OperatieCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = create_operatie(db, payload)
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja o operație cu acest cod.")
    return result

@app.put("/api/nomenclature/operatii")
def update_operatie_api(payload: OperatieUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_operatie(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Operație inexistentă.")
    return result

@app.delete("/api/nomenclature/operatii/{operatie_id}")
def delete_operatie_api(operatie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_operatie(db, operatie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Operație inexistentă.")
    return {"message": "Operație ștearsă."}

# ---- OPERAȚII MENTENANȚĂ (CRUD real, conectat la baza de date) ----

@app.get("/api/nomenclature/operatii_mentenanta")
def get_operatii_mentenanta_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_operatii_mentenanta(db)

@app.post("/api/nomenclature/operatii_mentenanta")
def create_operatie_mentenanta_api(payload: OperatieMentenantaCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_operatie_mentenanta(db, payload)

@app.put("/api/nomenclature/operatii_mentenanta")
def update_operatie_mentenanta_api(payload: OperatieMentenantaUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_operatie_mentenanta(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Operație de mentenanță inexistentă.")
    return result

@app.delete("/api/nomenclature/operatii_mentenanta/{operatie_id}")
def delete_operatie_mentenanta_api(operatie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_operatie_mentenanta(db, operatie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Operație de mentenanță inexistentă.")
    return {"message": "Operație de mentenanță ștearsă."}

# ---- LISTE OPERAȚII MENTENANȚĂ (CRUD real, conectat la baza de date) ----

@app.get("/api/nomenclature/liste_operatii")
def get_liste_operatii_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_liste_operatii(db)

@app.post("/api/nomenclature/liste_operatii")
def create_lista_operatii_api(payload: ListaOperatiiCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_lista_operatii(db, payload)

@app.put("/api/nomenclature/liste_operatii")
def update_lista_operatii_api(payload: ListaOperatiiUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_lista_operatii(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Listă de operații inexistentă.")
    return result

@app.delete("/api/nomenclature/liste_operatii/{lista_id}")
def delete_lista_operatii_api(lista_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_lista_operatii(db, lista_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Listă de operații inexistentă.")
    return {"message": "Listă de operații ștearsă."}

@app.post("/api/nomenclature/liste_operatii/{lista_id}/adauga_op/{operatie_id}")
def adauga_operatie_in_lista_api(lista_id: int, operatie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = adauga_op_in_lista(db, lista_id, operatie_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau operația inexistentă.")
    return result

@app.post("/api/nomenclature/liste_operatii/{lista_id}/scoate_op/{operatie_id}")
def scoate_operatie_din_lista_api(lista_id: int, operatie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = scoate_op_din_lista(db, lista_id, operatie_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau operația inexistentă.")
    return result

@app.get("/api/nomenclature/utilizatori_pmb")
def get_utilizatori_pmb_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_utilizatori_pmb(db)

@app.post("/api/nomenclature/utilizatori_pmb")
def create_utilizator_pmb_api(payload: UtilizatorPMBCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_utilizator_pmb(db, payload)

@app.put("/api/nomenclature/utilizatori_pmb")
def update_utilizator_pmb_api(payload: UtilizatorPMBUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_utilizator_pmb(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return result

@app.delete("/api/nomenclature/utilizatori_pmb/{utilizator_id}")
def delete_utilizator_pmb_api(utilizator_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_utilizator_pmb(db, utilizator_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return {"message": "Utilizator șters."}

@app.post("/api/nomenclature/utilizatori_pmb/{utilizator_id}/toggle_activ")
def toggle_activ_utilizator_pmb_api(utilizator_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = toggle_activ_utilizator_pmb(db, utilizator_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Utilizator inexistent.")
    return result

@app.get("/api/nomenclature/grupuri_munca_public")
def get_grupuri_munca_public_api(db: Session = Depends(get_db)):
    """
    Varianta publica (fara token) folosita de pagina de Register, unde
    utilizatorul nu e inca autentificat. Expune strict numele grupurilor,
    nu si membrii sau departamentul.
    """
    return [g["grup"] for g in get_grupuri_munca(db)]

@app.get("/api/nomenclature/grupuri_munca")
def get_grupuri_munca_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_grupuri_munca(db)

@app.post("/api/nomenclature/grupuri_munca")
def create_grup_munca_api(payload: GrupMuncaCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = create_grup_munca(db, payload)
    if result is None:
        raise HTTPException(status_code=400, detail="Numele grupului este obligatoriu.")
    if result == "DUPLICAT":
        raise HTTPException(status_code=409, detail="Există deja un grup cu acest nume.")
    return result

@app.get("/api/nomenclature/piese")
def get_piese_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_piese(db)

@app.post("/api/nomenclature/piese")
def create_piesa_api(payload: PiesaCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_piesa(db, payload)

@app.put("/api/nomenclature/piese")
def update_piesa_api(payload: PiesaUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_piesa(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Piesa inexistenta.")
    return result

@app.delete("/api/nomenclature/piese/{piesa_id}")
def delete_piesa_api(piesa_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_piesa(db, piesa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Piesa inexistenta.")
    return {"message": "Piesa stearsa."}

@app.get("/api/nomenclature/liste_piese")
def get_liste_piese_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_liste_piese(db)

@app.post("/api/nomenclature/liste_piese")
def create_lista_piese_api(payload: ListaPieseCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_lista_piese(db, payload)

@app.put("/api/nomenclature/liste_piese")
def update_lista_piese_api(payload: ListaPieseUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = update_lista_piese(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista inexistenta.")
    return result

@app.delete("/api/nomenclature/liste_piese/{lista_id}")
def delete_lista_piese_api(lista_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_lista_piese(db, lista_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lista inexistenta.")
    return {"message": "Lista stearsa."}

@app.post("/api/nomenclature/liste_piese/{lista_id}/adauga_piesa/{piesa_id}")
def adauga_piesa_in_lista_api(lista_id: int, piesa_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = adauga_piesa_in_lista(db, lista_id, piesa_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau piesa inexistenta.")
    return result

@app.post("/api/nomenclature/liste_piese/{lista_id}/scoate_piesa/{piesa_id}")
def scoate_piesa_din_lista_api(lista_id: int, piesa_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    result = scoate_piesa_din_lista(db, lista_id, piesa_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Lista sau piesa inexistenta.")
    return result

@app.get("/api/nomenclature/sectii")
def get_sectii_api(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return get_all_sectii(db)

@app.post("/api/nomenclature/sectii")
def create_sectie_api(payload: SectieCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    return create_sectie(db, payload)

@app.put("/api/nomenclature/sectii/{sectie_id}")
def update_sectie_api(sectie_id: int, payload: SectieUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    if payload.id != sectie_id:
        raise HTTPException(status_code=400, detail="ID-ul din URL nu corespunde cu ID-ul din payload.")
    result = update_sectie(db, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Secție inexistentă.")
    return result

@app.delete("/api/nomenclature/sectii/{sectie_id}")
def delete_sectie_api(sectie_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    get_current_user(token, db)
    ok = delete_sectie(db, sectie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Secție inexistentă.")
    return {"message": "Secție ștearsă."}