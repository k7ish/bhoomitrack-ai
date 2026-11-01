# 🇮🇳 BhoomiTrack AI — National Land Acquisition System
**Smart India Hackathon (SIH26016) Submission**

BhoomiTrack AI is an end-to-end GovTech platform designed to digitize, streamline, and bring transparency to the land acquisition lifecycle under the **RFCTLARR Act, 2013**. It bridges the gap between Government Acquiring Authorities (NHAI, GMADA) and Project-Affected Citizens (Khatedars).

## 🚀 Key Features

* **Dual-Portal Architecture:** Dedicated workspaces for Government Officials (Command & Control) and Public Landowners (Jan-Bhoomi Self-Service).
* **Authentic Cadastral GIS Engine:** Renders true-to-life irregular Punjab BhuNaksha Musavi maps (e.g., *Mauli Baidwan* & *Jhanjeri* paddy belts) with exact Khasra/Murabba dimensions, NOT generic grid squares.
* **Interactive Highway & Toll Route Planner:** Allows officials to draw greenfield highway alignments, set Right-of-Way (RoW) buffers (60m/100m), and instantly auto-calculate intersected land, dispute bottlenecks, and compensation.
* **Gemini 3.8 Flash AI Intelligence Centre:** Server-side decision support that analyzes live JSON data to flag statutory Section 11/19 expiry deadlines, linear continuity blockers, and PFMS escrow holdbacks.
* **Real-Time RFCTLARR Workflow:** Tracks the 6 statutory stages from Section 4 (SIA) to Section 38 (Possession), dynamically updating GIS map polygon colors (Available vs Disputed).

## 🛠 Tech Stack
* **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Recharts
* **GIS & Mapping:** Leaflet.js (Esri Satellite & OpenStreetMap tiles)
* **Backend & API:** Node.js, Express (`server.ts`)
* **Database & Auth:** Firebase Firestore, Google Authentication
* **AI Integration:** Google Gemini API (`@google/genai`)

## ⚙️ Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/k7ish/bhoomitrack-ai.git](https://github.com/k7ish/bhoomitrack-ai.git)
   cd bhoomitrack-ai
   
