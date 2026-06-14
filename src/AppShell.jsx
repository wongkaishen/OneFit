"use client";
import React, { useEffect, useRef, useState } from "react";
import PhoneFrame from "./mobile/PhoneFrame";
import LoginScreen from "./mobile/screens/LoginScreen";
import DashboardScreen from "./mobile/screens/DashboardScreen";
import LogActivityScreen from "./mobile/screens/LogActivityScreen";
import LogDietScreen from "./mobile/screens/LogDietScreen";
import MilestoneScreen from "./mobile/screens/MilestoneScreen";

import ClientList from "./web/screens/ClientList";
import ClientDetail from "./web/screens/ClientDetail";
import CreateMealPlan from "./web/screens/CreateMealPlan";
import AdminDashboard from "./web/screens/AdminDashboard";
import UserManagement from "./web/screens/UserManagement";
import ContentPrograms from "./web/screens/ContentPrograms";

const SURFACES = [
  { id: "app", label: "App" },
  { id: "wellness", label: "Wellness Specialist" },
  { id: "admin", label: "Admin" },
];

const APP_SCREENS = {
  login: "Login",
  home: "Dashboard",
  activity: "Log Activity",
  diet: "Log Diet",
  milestone: "Milestone",
};

const WELLNESS_SCREENS = {
  clients: "Client List",
  detail: "Client Detail",
  plan: "Create Meal Plan",
};

const ADMIN_SCREENS = {
  dash: "Dashboard",
  users: "User Management",
  content: "Content & Programs",
};

const FIRST_SCREEN = { app: "login", wellness: "clients", admin: "dash" };
const SCREEN_MAP = { app: APP_SCREENS, wellness: WELLNESS_SCREENS, admin: ADMIN_SCREENS };

const ACCENTS = [
  { value: "#E85D4A", label: "Coral" },
  { value: "#B94838", label: "Warm red" },
  { value: "#D8732E", label: "Burnt" },
];

function persisted(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function useScale(width = 1440) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const recompute = () => {
      const available = window.innerWidth - 48;
      setScale(Math.min(1, available / width));
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [width]);
  return scale;
}

function Tweaks({ personalBeats, accent, onTweak }) {
  return (
    <div className="tweaks">
      <h4>Typography</h4>
      <div className="row">
        <span>Personal beats</span>
        <div className="seg">
          {["Inter", "EB Garamond"].map((opt) => (
            <button
              key={opt}
              className={personalBeats === opt ? "on" : ""}
              onClick={() => onTweak("personalBeats", opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <h4>Color</h4>
      <div className="row">
        <span>Accent</span>
        <div className="chips">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              title={a.label}
              className={`chip${accent === a.value ? " on" : ""}`}
              style={{ background: a.value }}
              onClick={() => onTweak("accent", a.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [surface, setSurface] = useState(() => persisted("onefit-surface", "app"));
  const [screen, setScreen] = useState(() =>
    persisted("onefit-screen-" + persisted("onefit-surface", "app"), FIRST_SCREEN[persisted("onefit-surface", "app")])
  );
  const [client, setClient] = useState(null);
  const [personalBeats, setPersonalBeats] = useState(() =>
    persisted("onefit-tweak-personal", "EB Garamond")
  );
  const [accent, setAccent] = useState(() => persisted("onefit-tweak-accent", "#E85D4A"));

  const webScale = useScale(1440);

  // Persist
  useEffect(() => {
    localStorage.setItem("onefit-surface", surface);
  }, [surface]);
  useEffect(() => {
    localStorage.setItem("onefit-screen-" + surface, screen);
  }, [screen, surface]);
  useEffect(() => {
    localStorage.setItem("onefit-tweak-personal", personalBeats);
  }, [personalBeats]);
  useEffect(() => {
    localStorage.setItem("onefit-tweak-accent", accent);
  }, [accent]);

  // Tweak side effects
  useEffect(() => {
    const root = document.documentElement;
    const serif = personalBeats === "EB Garamond";
    root.style.setProperty("--font-greeting", serif ? "var(--font-serif)" : "var(--font-sans)");
    root.style.setProperty("--font-numeral", serif ? "var(--font-serif)" : "var(--font-sans)");
  }, [personalBeats]);
  useEffect(() => {
    document.documentElement.style.setProperty("--coral", accent);
  }, [accent]);

  const screens = SCREEN_MAP[surface];
  const handleTweak = (k, v) => {
    if (k === "personalBeats") setPersonalBeats(v);
    if (k === "accent") setAccent(v);
  };

  // Switching surface resets to its first screen if current screen doesn't exist
  useEffect(() => {
    if (!SCREEN_MAP[surface][screen]) {
      setScreen(FIRST_SCREEN[surface]);
    }
  }, [surface, screen]);

  const renderApp = () => {
    switch (screen) {
      case "login":
        return <LoginScreen onSignIn={() => setScreen("home")} />;
      case "home":
        return (
          <DashboardScreen
            onTab={(t) => {
              if (t === "Train") setScreen("activity");
              else if (t === "Eat") setScreen("diet");
            }}
          />
        );
      case "activity":
        return (
          <LogActivityScreen
            onBack={() => setScreen("home")}
            onSave={() => setScreen("milestone")}
          />
        );
      case "diet":
        return <LogDietScreen onBack={() => setScreen("home")} />;
      case "milestone":
        return <MilestoneScreen onShare={() => setScreen("home")} />;
      default:
        return null;
    }
  };

  const renderWellness = () => {
    switch (screen) {
      case "clients":
        return (
          <ClientList
            onOpenClient={(c) => {
              setClient(c);
              setScreen("detail");
            }}
            onNav={(item) => {
              if (item === "Plans") setScreen("plan");
              else if (item === "Clients") setScreen("clients");
            }}
          />
        );
      case "detail":
        return (
          <ClientDetail
            client={client}
            onBack={() => setScreen("clients")}
            onNav={(item) => {
              if (item === "Plans") setScreen("plan");
              else if (item === "Clients") setScreen("clients");
            }}
          />
        );
      case "plan":
        return (
          <CreateMealPlan
            onBack={() => setScreen("clients")}
            onNav={(item) => {
              if (item === "Clients") setScreen("clients");
              else if (item === "Plans") setScreen("plan");
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderAdmin = () => {
    const onNav = (item) => {
      if (item === "Users") setScreen("users");
      else if (item === "Content") setScreen("content");
    };
    switch (screen) {
      case "dash":
        return <AdminDashboard onNav={onNav} />;
      case "users":
        return <UserManagement onNav={onNav} />;
      case "content":
        return <ContentPrograms onNav={onNav} />;
      default:
        return null;
    }
  };

  const isWeb = surface !== "app";

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div className="brand">
          <span className="mark" />
          <span className="word">onefit</span>
          <span className="sub">{isWeb ? "Web UI Kit" : "App UI Kit"}</span>
        </div>
        <div className="group">
          <span className="group-label">Surface</span>
          {SURFACES.map((s) => (
            <button
              key={s.id}
              className={`tb-btn${surface === s.id ? " active" : ""}`}
              onClick={() => {
                setSurface(s.id);
                const next = persisted("onefit-screen-" + s.id, FIRST_SCREEN[s.id]);
                setScreen(SCREEN_MAP[s.id][next] ? next : FIRST_SCREEN[s.id]);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="group">
          <span className="group-label">Screen</span>
          {Object.entries(screens).map(([id, label]) => (
            <button
              key={id}
              className={`tb-btn${screen === id ? " active" : ""}`}
              onClick={() => setScreen(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="spacer" />
      </div>

      {surface === "app" && (
        <div className="stage-mobile">
          <PhoneFrame
            bg={screen === "milestone" ? "var(--coral)" : "var(--cream)"}
            statusInk={screen === "milestone" ? "var(--charcoal)" : "var(--charcoal)"}
          >
            {renderApp()}
          </PhoneFrame>
        </div>
      )}

      {surface !== "app" && (
        <div className="stage-web">
          <div
            className="web-frame-outer"
            style={{ width: 1440 * webScale, height: 900 * webScale }}
          >
            <div
              className="web-frame"
              style={{ transform: `scale(${webScale})`, transformOrigin: "top left" }}
            >
              {surface === "wellness" ? renderWellness() : renderAdmin()}
            </div>
          </div>
        </div>
      )}

      <Tweaks personalBeats={personalBeats} accent={accent} onTweak={handleTweak} />
    </div>
  );
}
