"use client";

import { useState, useEffect } from "react";
import { Save, Check, RotateCcw } from "lucide-react";

const STORAGE_KEY = "aivideo_settings";
interface AppSettings { apiUrl: string; useMock: boolean; pollingInterval: number; theme: string; }
const DEFAULT_SETTINGS: AppSettings = { apiUrl: "http://localhost:8000", useMock: false, pollingInterval: 2000, theme: "dark" };

function loadSettings(): AppSettings { if (typeof window === "undefined") return DEFAULT_SETTINGS; try { const s = localStorage.getItem(STORAGE_KEY); if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) }; } catch {} return DEFAULT_SETTINGS; }
function saveSettingsToStorage(settings: AppSettings) { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }

import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => { const l = loadSettings(); setSettings(l); setOriginalSettings(l); }, []);
  useEffect(() => { setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings)); setSaved(false); }, [settings, originalSettings]);

  const handleSave = () => {
    saveSettingsToStorage(settings); setOriginalSettings(settings); setSaved(true); setHasChanges(false);
    setTimeout(() => setSaved(false), 2000);
    if (settings.useMock !== originalSettings.useMock) { if (window.confirm("Mock API setting changed. Reload page to apply?")) window.location.reload(); }
  };

  const handleReset = () => { setSettings(DEFAULT_SETTINGS); saveSettingsToStorage(DEFAULT_SETTINGS); setOriginalSettings(DEFAULT_SETTINGS); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
          <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>Configure application preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn btn-default flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button>
          <button onClick={handleSave} disabled={!hasChanges && !saved}
            className={`btn flex items-center gap-2 ${saved ? "btn-primary" : hasChanges ? "btn-primary" : "btn-primary"}`}
            style={!hasChanges && !saved ? { background: "#E8DDDE", color: "#A99699", cursor: "not-allowed" } : saved ? { background: "#178553" } : {}}>
            {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{t("language")}</h3>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Interface Language</label>
            <select 
              value={typeof window !== "undefined" ? document.cookie.split('; ').find(row => row.startsWith('NEXT_LOCALE='))?.split('=')[1] || 'en' : 'en'} 
              onChange={(e) => {
                document.cookie = `NEXT_LOCALE=${e.target.value}; path=/; max-age=31536000`;
                window.location.reload();
              }} 
              className="input-admin w-40"
            >
              <option value="en">{t("english")}</option>
              <option value="vi">{t("vietnamese")}</option>
            </select>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{t("language_description")}</p>
          </div>
        </div>

        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>API Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>API Base URL</label>
              <input type="text" value={settings.apiUrl} onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} className="input-admin" />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Backend API server address</p>
            </div>
            <div className="flex items-center justify-between">
              <div><span className="text-sm" style={{ color: "var(--text-primary)" }}>Use Mock API</span><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Use fake data for development</p></div>
              <button onClick={() => setSettings({ ...settings, useMock: !settings.useMock })} className="w-10 h-5 rounded-full transition-colors" style={{ background: settings.useMock ? "var(--primary)" : "#EBDCDD" }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.useMock ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Language</h3>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Interface Language</label>
            <select 
              value={typeof window !== "undefined" ? document.cookie.split('; ').find(row => row.startsWith('NEXT_LOCALE='))?.split('=')[1] || 'en' : 'en'} 
              onChange={(e) => {
                document.cookie = `NEXT_LOCALE=${e.target.value}; path=/; max-age=31536000`;
                window.location.reload();
              }} 
              className="input-admin w-40"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Choose your preferred language for the interface.</p>
          </div>
        </div>

        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Data Refresh</h3>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Polling Interval (ms)</label>
            <input type="number" value={settings.pollingInterval} onChange={(e) => setSettings({ ...settings, pollingInterval: Number(e.target.value) })} min={500} max={30000} step={500} className="input-admin w-32" />
          </div>
        </div>

        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Appearance</h3>
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Theme</label>
            <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })} className="input-admin w-40">
              <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-default)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Settings are stored in your browser&apos;s localStorage. They persist across sessions but are not synced between devices.</p>
        </div>
      </div>
    </div>
  );
}
