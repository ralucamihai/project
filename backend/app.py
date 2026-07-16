from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio

from ips_monitoring.main import *
from pmb_dashboard.main import *
from login.main import *
from configurations.main import *

# VERSION = os.environ["VERSION"]
# BUILD = os.environ["BUILD"]
VERSION = os.getenv("VERSION", "dev")
BUILD = os.getenv("BUILD", "local")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        clients.remove(websocket)


def trigger_broadcast(message: str):
    asyncio.run(broadcast(message))
    # asyncio.create_task(broadcast("msg"))


async def broadcast(message: str):
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Sending broadcast message: {message}!"
    )

    for client in clients:
        await client.send_text(message)


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
            broadcast("guide_text_data_updated")
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
    # data = create_expanded_dataframe(get_directory_structure_with_psn_data(PMB_DASHBOARD_ROOT_DIRECTORY))
    # print(data)

    # Load the cached data
    # data = load_expanded_data(PMB_DASHBOARD_CACHE_FILE_NAME, False, startDate, endDate, productCode)

    conn = get_connection()
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
    conn.close()

    return data


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


# POST api to register a new user
@app.post("/api/register")
async def register(
    user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    # if user:
    # asyncio.create_task(broadcast("user_management_data_updated"))
    background_tasks.add_task(trigger_broadcast, "user_management_data_updated")
    return register_new_user(user, db)


# POST api to log in a new user
@app.post("/api/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    return login_for_access_token(form_data, db)


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


# GET api to get all users
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = get_all_users(
        db,
        ["firstName", "lastName", "username", "email", "employeeNo", "role", "status"],
    )
    return {"users": users}


# GET api to return if the current token is correct and validate page access
@app.get("/api/user")
def user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    current_user = get_current_user(token, db)
    if current_user:
        user_dict = current_user.__dict__.copy()
        user_dict.pop("password_hash", None)
        return user_dict
    return current_user.username


# GET api to return if the current token is correct and validate page access
@app.get("/api/all_users")
def user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    all_users = get_all_users_with_credentials(token, db)
    return all_users


@app.post("/api/approve_user")
def user(
    user: UserApprove,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = approve_user_with_credentials(user=user, token=token, db=db)
    if user:
        asyncio.run(broadcast("user_management_data_updated"))
    return user


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
def update_user_info(
    updateUserInfo: UserUpdateInfo,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = update_user_info_with_credentials(
        updateUserInfo=updateUserInfo, token=token, db=db
    )
    if user:
        asyncio.run(broadcast("user_management_data_updated"))
    return user


@app.post("/api/forgot_password")
def forgot_pass(email: UserForgotPassword, db: Session = Depends(get_db)):
    forgot_password(email, db)


def run_pmb_dashboard_refresh_ws():
    updated = run_pmb_dashboard_refresh()

    if updated:
        asyncio.run(broadcast("pmb_dashboard_data_updated"))


# def run_ips_monitoring_refresh_ws():
#     updated = run_ips_monitoring_refresh()

#     if updated:
#         asyncio.run(broadcast("ips_monitoring_data_updated"))

scheduler = BackgroundScheduler()
scheduler.add_job(
    run_pmb_dashboard_refresh_ws,
    args=[],
    max_instances=1,
    trigger="interval",
    minutes=int(PMB_DASHBOARD_CACHE_REFRESH_INTERVAL_MINUTES),
    next_run_time=datetime.now(),
)  # Job to reload Catalog file
# scheduler.add_job(run_ips_monitoring_refresh_ws,args=[],max_instances=1,
#                   trigger='interval', minutes=int(PMB_DASHBOARD_CACHE_REFRESH_INTERVAL_MINUTES), next_run_time=datetime.now())
# scheduler.start()
