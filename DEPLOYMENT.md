# Deployment Instructions

## SceneSense AI Platform

### 1. Environment Variables Setup

#### Backend (`/backend/.env`)
Create a `.env` file in the `backend` directory with your Google Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Frontend (`/frontend/.env.local`)
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
*(For production, replace this with your deployed backend URL, e.g., `https://your-backend.onrender.com/api/v1`)*

---

### 2. Deploying Backend to Render

1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables in the Render dashboard:
   - `GEMINI_API_KEY`: Your Gemini API Key
5. Click **Deploy**.

---

### 3. Deploying Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Connect your GitHub repository.
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Add Environment Variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed Render backend (e.g., `https://your-app.onrender.com/api/v1`)
5. Click **Deploy**.

Once both are deployed, your Next.js frontend will communicate securely with the FastAPI backend, which handles dataset processing, file uploads, and Gemini AI RAG capabilities.
