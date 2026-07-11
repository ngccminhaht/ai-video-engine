"use client";

import { useState, useEffect } from "react";
import { Save, Check, RotateCcw } from "lucide-react";

const STORAGE_KEY = "aivideo_settings";

interface AppSettings {
  apiUrl: string;
  useMock: boolean;
  pollingInterval: number;
  theme: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiUrl: "http://localhost:8000",
  useMock: false,
  pollingInterval: 2000,
  theme: "dark",
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setOriginalSettings(loaded);
  }, []);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
    setSaved(false);
  }, [settings, originalSettings]);

  const handleSave = () => {
    saveSettings(settings);
    setOriginalSettings(settings);
    setSaved(true);
    setHasChanges(false);

    // Show saved indicator for 2s
    setTimeout(() => setSaved(false), 2000);

    // If mock toggle changed, need page reload for env var simulation
    if (settings.useMock !== originalSettings.useMock) {
      if (window.confirm("Mock API setting changed. Reload page to apply?")) {
        window.location.reload();
      }
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setOriginalSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure application preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges && !saved}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? "bg-emerald-600 text-white"
                : hasChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* API Configuration */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground">API Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                API Base URL
              </label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Backend API server address (default: http://localhost:8000)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Use Mock API</span>
                <p className="text-xs text-muted-foreground">
                  Use fake data for development (requires page reload)
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, useMock: !settings.useMock })}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.useMock ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings.useMock ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Polling */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Data Refresh</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Polling Interval (ms)
            </label>
            <input
              type="number"
              value={settings.pollingInterval}
              onChange={(e) => setSettings({ ...settings, pollingInterval: Number(e.target.value) })}
              min={500}
              max={30000}
              step={500}
              className="w-32 h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              How often to refresh job status and dashboard data (500ms - 30000ms)
            </p>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Appearance</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="w-40 h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="bg-secondary/30 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            Settings are stored in your browser&apos;s localStorage. They persist across sessions but are not synced between devices.
          </p>
        </div>
      </div>
    </div>
  );
}
