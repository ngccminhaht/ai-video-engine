"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [useMock, setUseMock] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(2000);
  const [theme, setTheme] = useState("dark");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure application preferences
        </p>
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
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Use Mock API</span>
                <p className="text-xs text-muted-foreground">
                  Use fake data for development
                </p>
              </div>
              <button
                onClick={() => setUseMock(!useMock)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  useMock ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    useMock ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Polling */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Polling</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Job Polling Interval (ms)
            </label>
            <input
              type="number"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              min={500}
              max={10000}
              step={500}
              className="w-32 h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
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
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-40 h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
