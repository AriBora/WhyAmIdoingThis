## Setup

### Prerequisites
1. Install Git Bash if not present
2. Install VS Code or any other IDE
3. Install Antigravity (https://antigravity.google/download)
4. Node JS and Python
5. Docker Desktop (for the database)

### Clone the codebase
<code>git clone https://github.com/AriBora/WhyAmIdoingThis.git</code>

### Frontend dashboard application
1. <code>cd /frontend</code>
2. <code>npm install</code> to install dependencies
3. <code>npm run dev</code>

### Sample apps
Similiar to frontend dashboard

### FASTAPI Backend
1. <code>cd backend</code>
2. <code>python -m venv .venv</code>
3. <code>.\.venv\Scripts\activate</code>
4. <code>pip install -r requirements.txt</code>
5. <code>uvicorn main:app --host 0.0.0.0 --port 8080</code>
6. Test it by visiting 127.0.0.1:8080/docs on browser.

### Database
1. <code>docker compose up -d</code>
2. For deletion, <code>docker compose down -v</code>


## Tasks to do
1. Make it work
2. Finalise the database schema. Current tables: application, dashboard tiles, events, feedback. What should be the columns of the events ?
3. Modify the track function of the sample demo-bank app according to the events table schema.
4. Test the workflow: event triggered in sample demo-bank app gets written in the database via the backend.
5. test the new chart creation both manually and via the google-adk agent.
6. Make necessary UI changes for the chart creation process.
7. When new chart gets added, it should write in the database.
8. Test the question answering agent, whether it can perform sql query and answer or not. 
