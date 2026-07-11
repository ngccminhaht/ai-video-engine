"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Terminal, Cpu, Video, FileText } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Documentation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI Video Platform — Guides & API Reference
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                API Reference (Swagger)
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Interactive API documentation with all endpoints, schemas, and try-it-out
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Quick Start</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generate your first video in under 5 minutes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Cpu className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Model Adapters</h3>
              <p className="text-xs text-muted-foreground mt-1">
                How to add new AI models and configure adapters
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Architecture</h3>
              <p className="text-xs text-muted-foreground mt-1">
                System overview: API, Worker, Queue, and Model lifecycle
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">1. Start Infrastructure</h3>
              <code className="block bg-secondary rounded-lg p-3 text-xs text-foreground font-mono">
                docker compose -f docker-compose.dev.yml up -d
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">2. Run API Server</h3>
              <code className="block bg-secondary rounded-lg p-3 text-xs text-foreground font-mono">
                python -m uvicorn apps.api.main:app --reload --port 8000
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">3. Run Worker</h3>
              <code className="block bg-secondary rounded-lg p-3 text-xs text-foreground font-mono">
                python -m arq apps.worker.WorkerSettings
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">4. Run Frontend</h3>
              <code className="block bg-secondary rounded-lg p-3 text-xs text-foreground font-mono">
                cd apps/web && npm run dev
              </code>
            </div>
          </div>
        </section>

        {/* API Overview */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Method</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Endpoint</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  ["GET", "/health", "System health check"],
                  ["GET", "/api/v1/models", "List registered models"],
                  ["POST", "/api/v1/models", "Register a new model"],
                  ["GET", "/api/v1/jobs", "List all jobs (with filters)"],
                  ["POST", "/api/v1/jobs", "Create a generation job"],
                  ["GET", "/api/v1/jobs/:id", "Get job status & result"],
                  ["POST", "/api/v1/jobs/:id/cancel", "Cancel a pending job"],
                  ["POST", "/api/v1/upload", "Upload an input file"],
                  ["GET", "/api/v1/workers", "List GPU workers"],
                  ["GET", "/api/v1/storage/stats", "Storage usage stats"],
                ].map(([method, path, desc]) => (
                  <tr key={path} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4">
                      <span className={`font-mono font-medium ${method === "GET" ? "text-emerald-400" : "text-yellow-400"}`}>
                        {method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-foreground">{path}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Support */}
        <section id="support">
          <h2 className="text-lg font-semibold mb-4">Help & Support</h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-foreground">Swagger UI</p>
                <p className="text-xs text-muted-foreground">
                  Visit <a href="/api/v1/docs" target="_blank" className="text-primary hover:underline">/api/v1/docs</a> for interactive API testing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Terminal className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-foreground">Source Code</p>
                <p className="text-xs text-muted-foreground">
                  Check the project&apos;s MASTER_PLAN.md and kiro.md for detailed architecture docs
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
