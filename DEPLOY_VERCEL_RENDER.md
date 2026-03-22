# Deploy Healthcare UI with Vercel (Frontend) + Render (Backend)

This guide is tailored to this repository structure:
- Frontend: `frontend`
- Backend: `backend`

## 1) Deploy Backend on Render

1. Push your latest code to GitHub.
2. In Render, click New > Web Service.
3. Select your repository.
4. Configure service:
   - Root Directory: `backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/health`
5. Add environment variables in Render:
   - `NODE_ENV=production`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FRONTEND_ORIGIN` (set this to your Vercel frontend URL)
   - Any optional keys your features use:
     - `GEMINI_API_KEY`
     - `RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `RAZORPAY_WEBHOOK_SECRET`
     - `GMAIL_USER`
     - `GMAIL_PASSWORD`
     - `CONTACT_EMAIL`
     - `OPENAI_API_KEY`
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_PHONE_NUMBER`
6. Deploy the service.
7. Verify backend health endpoint:
   - `https://<your-render-service>.onrender.com/health`

## 2) Deploy Frontend on Vercel

1. In Vercel, click Add New > Project.
2. Import the same GitHub repository.
3. Configure project:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables in Vercel:
   - `VITE_API_URL=https://<your-render-service>.onrender.com`
   - `VITE_SOCKET_URL=https://<your-render-service>.onrender.com`
   - Optional:
     - `VITE_HEALTHPRO_UPI_ID`
     - `VITE_HEALTHPRO_UPI_QR_PATH`
5. Deploy.

## 3) Wire Both Sides Together

1. Copy your Vercel production URL.
2. In Render, set `FRONTEND_ORIGIN` to that URL.
   - If you use multiple frontend domains, set a comma-separated list.
3. Redeploy/restart Render.

## 4) Final Verification

1. Open frontend URL from Vercel.
2. Test authentication and API-backed pages.
3. Test realtime features (notifications/chat/consultation socket).
4. Confirm there are no CORS errors in browser console.

## Notes

- This repo still has `netlify.toml` for previous Netlify deploys. It can remain in place, but it is not used by Vercel.
- Backend uploads directory is local to runtime. For durable uploads in production, use object storage (for example S3 or Cloudinary).
- Quick env templates are available at:
   - `backend/.env.render.example`
   - `frontend/.env.vercel.example`
