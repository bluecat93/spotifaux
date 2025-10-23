Spotifaux — Project README

Overview  
The Spotifaux project is a minimal two-part web application composed of a frontend (client) and a backend (API).  
The frontend is a single-page app responsible for the user interface and client-side logic, while the backend is a REST API that handles business logic, data persistence, and authentication.

To build and run both the frontend and backend using Docker Compose:
* docker compose up --build

Development Notes  
This project was designed as a concise take-home assignment focused on functionality rather than production-ready infrastructure. 
To keep setup lightweight, no production database is included. 
Instead, the backend uses JSON files for persistence (see `spotifaux-backend/DB/`).
This choice was made primarily for development speed and simplicity, allowing faster iteration while maintaining clear, readable data. 
If needed, this setup can be replaced with a more scalable solution later on.


Frontend (Client) - React + Vite
* Purpose: Present the UI, handle routing, validation, and communication with the backend API.
* Key behavior:
  * Uses HTTP requests to communicate with the backend.
  * Relies on secure httpOnly cookies for authentication (handled automatically by the browser).
  * Validates input on the client side and displays any server-side validation errors.
* Run example:
  * cd spotifaux-frontend
  * npm install
  * npm run dev


Backend (API) — Python + FastAPI
* Purpose: Expose REST endpoints, authenticate and authorize users, and persist data.
* Run example:
  * cd spotifaux-backend
  * python -m venv .venv
  * source .venv/bin/activate   # or .venv\Scripts\activate on Windows
  * pip install -r requirements.txt
  * uvicorn app.main:app --reload --port 8000

Limitations of JSON-based DB
* No transactional guarantees.
* Possible race conditions under concurrent writes.
* Limited query capabilities.


End of file.
