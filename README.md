# **Full-Stack Application Setup Guide**

## **Prerequisites**

Before you begin, ensure you have the following installed:

- Python (3.8+ recommended) - https://www.python.org/downloads/
- Node.js (14+ recommended) - https://nodejs.org/
- npm (comes with Node.js)
- Angular CLI - Install via npm in the Backend Setup

## **Backend Setup**

1. Navigate to the Backend directory
`cd backend`

2. Create a virtual env
`python -m venv venv`

3. Activate the virtual environment
`venv\Scripts\activate`

4. Install dependencies
`pip install -r requirements.txt`
`pip install openpyxl`

6. Start the backend server
`uvicorn app:app --reload`

The API will be available at http://localhost:8000.
You can also force a port:
`uvicorn app:app --host 0.0.0.0 --port 8080 --reload`

## **Frontend Setup**

1. Navigate to the frontend directory
`cd frontend`

2. Install dependencies
`npm install`

3. Install Angular CLI
`npm install -g @angular/cli`
`npm install @angular/core @angular/platform-browser @angular/platform-browser-dynamic`


5. Start the development server
`ng serve --host 0.0.0.0 --port 4200`

The application will be available at http://localhost:4200

## **Running the Complete Application**

1. Start the backend server in one terminal
2. Start the frontend server in another terminal
3. Open your browser and navigate to http://localhost:4200
