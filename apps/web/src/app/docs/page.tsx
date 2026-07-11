"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Terminal, Cpu, Video, FileText } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-[#101828]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-[#f9fafb] text-[#667085] hover:text-[#344054] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#101828]">Documentation</h1>
            <p className="text-sm text-[#667085] mt-1">
              Revid.IO — Guides & API Reference
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 bg-white border border-[#eaecf0] rounded-xl hover:border-[#d1e0ff] hover:shadow-sm transition-all"
          >
            <div className="p-2 bg-[#eff4ff] rounded-lg">
              <Terminal className="w-5 h-5 text-[#155eef]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828] flex items-center gap-1.5">
                API Reference (Swagger)
                <ExternalLink className="w-3 h-3 text-[#98a2b3]" />
              </h3>
              <p className="text-xs text-[#667085] mt-1">
                Interactive API documentation with all endpoints, schemas, and try-it-out
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-5 bg-white border border-[#eaecf0] rounded-xl">
            <div className="p-2 bg-[#eaf8f1] rounded-lg">
              <Video className="w-5 h-5 text-[#178553]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828]">Quick Start</h3>
              <p className="text-xs text-[#667085] mt-1">
                Generate your first video in under 5 minutes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-[#eaecf0] rounded-xl">
            <div className="p-2 bg-[#fff5df] rounded-lg">
              <Cpu className="w-5 h-5 text-[#b66a00]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828]">Model Adapters</h3>
              <p className="text-xs text-[#667085] mt-1">
                How to add new AI models and configure adapters
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-[#eaecf0] rounded-xl">
            <div className="p-2 bg-[#f6f5ff] rounded-lg">
              <BookOpen className="w-5 h-5 text-[#444ce7]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828]">Architecture</h3>
              <p className="text-xs text-[#667085] mt-1">
                System overview: API, Worker, Queue, and Model lifecycle
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[#101828] mb-4">Getting Started</h2>
          <div className="bg-white border border-[#eaecf0] rounded-xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-medium text-[#101828] mb-2">1. Start Infrastructure</h3>
              <code className="block bg-[#f9fafb] rounded-lg p-3 text-xs text-[#344054] font-mono">
                docker compose -f docker-compose.dev.yml up -d
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828] mb-2">2. Run API Server</h3>
              <code className="block bg-[#f9fafb] rounded-lg p-3 text-xs text-[#344054] font-mono">
                python -m uvicorn apps.api.main:app --reload --port 8000
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828] mb-2">3. Run Worker</h3>
              <code className="block bg-[#f9fafb] rounded-lg p-3 text-xs text-[#344054] font-mono">
                python -m arq apps.worker.WorkerSettings
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#101828] mb-2">4. Run Frontend</h3>
              <code className="block bg-[#f9fafb] rounded-lg p-3 text-xs text-[#344054] font-mono">
                cd apps/web && npm run dev
              </code>
            </div>
          </div>
        </section>

        {/* API Overview */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[#101828] mb-4">API Endpoints</h2>
          <div className="bg-white border border-[#eaecf0] rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#f9fafb]">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-[#667085]">Method</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-[#667085]">Endpoint</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-[#667085]">Description</th>
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
                  <tr key={path} className="border-b border-[#f2f4f7] last:border-0">
                    <td className="py-2.5 px-4">
                      <span className={`font-mono font-medium ${method === "GET" ? "text-[#178553]" : "text-[#b66a00]"}`}>
                        {method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#344054]">{path}</td>
                    <td className="py-2.5 px-4 text-[#667085]">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Support */}
        <section id="support">
          <h2 className="text-lg font-semibold text-[#101828] mb-4">Help & Support</h2>
          <div className="bg-white border border-[#eaecf0] rounded-xl p-6 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-[#667085] mt-0.5" />
              <div>
                <p className="text-sm text-[#101828]">Swagger UI</p>
                <p className="text-xs text-[#667085]">
                  Visit <a href="/api/v1/docs" target="_blank" className="text-[#155eef] hover:underline">/api/v1/docs</a> for interactive API testing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Terminal className="w-4 h-4 text-[#667085] mt-0.5" />
              <div>
                <p className="text-sm text-[#101828]">Source Code</p>
                <p className="text-xs text-[#667085]">
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
