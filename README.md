# SafeCity

> **AI-powered public safety platform for real-time incident detection, intelligent monitoring, and faster emergency response.**

SafeCity is a smart-city safety platform that combines **Artificial Intelligence, Computer Vision, real-time monitoring, and data-driven insights** to help identify and manage potential public-safety incidents.

The platform is designed to turn raw visual information into **actionable safety intelligence**, giving users a centralized interface to monitor incidents, understand their severity, and respond more effectively.

---

## ✨ Key Features

- 🤖 **AI-Powered Detection** — Uses computer vision and machine learning to identify potentially unsafe events.
- 📹 **Real-Time Monitoring** — Monitor incoming visual data and safety events from a centralized dashboard.
- 🚨 **Incident Alerts** — Surface important incidents for quicker attention and response.
- 📊 **Interactive Dashboard** — View active incidents, statistics, detection history, and system information in one place.
- 📍 **Location-Based Monitoring** — Associate incidents with locations for better situational awareness.
- 📈 **Incident Analytics** — Analyze incident categories, frequency, severity, and historical patterns.
- ⚡ **Response Support** — Convert detected events into structured information that can assist emergency-response decisions.
- 🔐 **Secure Authentication & Data Management** — Supabase-powered authentication and database infrastructure.

---

## 🎯 Problem

Modern cities generate large amounts of surveillance and sensor data, making continuous manual monitoring difficult and inefficient.

Important events such as accidents, unusual activities, crowd-related incidents, or other safety threats can require immediate attention.

**SafeCity addresses this challenge by using AI-assisted detection and centralized monitoring to help users identify important events faster and make informed decisions.**

---

## 🧠 How It Works

```text
Camera / Data Source
        ↓
Data Processing
        ↓
AI / Computer Vision
        ↓
Incident Detection
        ↓
Classification & Analysis
        ↓
Alert / Incident Record
        ↓
SafeCity Dashboard
        ↓
Human Decision & Response
```

The system follows a modular approach, allowing additional detection models, data sources, and safety-related capabilities to be integrated as the platform evolves.

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### AI & Computer Vision
- Machine Learning
- Deep Learning
- Computer Vision
- Object / Activity Detection
- Image & Video Processing

### Backend & Data
- Supabase
- PostgreSQL
- REST APIs
- Supabase Authentication

### Development
- Git & GitHub
- npm
- VS Code

---

## 📁 Project Structure

```text
SafeCity/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

> The exact structure may vary as the project evolves.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Nishi577/Safecity.git
cd Safecity
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Never commit your actual `.env` file or private credentials to GitHub.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL provided by Vite, typically:

```text
http://localhost:5173
```

### 5. Build for production

```bash
npm run build
```

---

## 📊 Dashboard

SafeCity is designed around a simple principle:

> **Detect → Understand → Prioritize → Respond**

The dashboard provides users with a centralized view of safety information, including:

- Active incidents
- Incident categories
- Severity information
- Detection history
- Locations
- Monitoring status
- Safety analytics

The interface prioritizes **clarity and quick situational understanding** so users can focus on important events rather than manually analyzing large volumes of raw data.

---

## 🌍 Potential Applications

SafeCity can be adapted for:

- Smart-city surveillance
- Public-space safety
- Traffic and accident monitoring
- Crowd monitoring
- Campus security
- Transportation hubs
- Event security
- Emergency-response support
- Industrial safety monitoring

---

## 🔮 Future Scope

- Real-time multi-camera monitoring
- Advanced accident and anomaly detection
- Crowd-density analysis
- Multi-object tracking
- Geospatial incident heatmaps
- Automated emergency notifications
- Predictive safety analytics
- Mobile application
- Automated incident reporting
- Integration with emergency-response systems
- Edge-AI deployment for low-latency detection

---

## ⚠️ Limitations

SafeCity is an AI-assisted safety platform and is **not a replacement for trained emergency personnel or official emergency-response systems**.

AI-based systems can produce false positives, false negatives, or incorrect classifications. Critical incidents should therefore involve appropriate human verification and decision-making.

---

## 🤝 Contributing

Contributions and improvements are welcome.

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add: your feature"
git push origin feature/your-feature
```

Then open a Pull Request.

---

## 👩‍💻 Author

**Nishi Shah**

GitHub: [@Nishi577](https://github.com/Nishi577)

---

## ⭐ Vision

**SafeCity aims to make public spaces safer by transforming real-time data into intelligent, actionable safety insights.**
```

### GitHub "About" description

For the small **About** box beside your repository, use:

> **AI-powered public safety platform for real-time incident detection, intelligent monitoring, situational awareness, and faster emergency response.**

And I'd add these **Topics**:

```text
ai
computer-vision
machine-learning
smart-city
public-safety
real-time-monitoring
incident-detection
react
typescript
supabase
