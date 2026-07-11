const fs = require('fs');

const file = 'apps/web/src/components/layout/sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTranslations')) {
  content = content.replace(/import Link from "next\/link";/, 'import Link from "next/link";\nimport { useTranslations } from "next-intl";');
  content = content.replace(/export function Sidebar\(\) \{/, 'export function Sidebar() {\n  const t = useTranslations("Sidebar");');
  
  // Replace labels
  content = content.replace(/label: "OPERATIONS"/, 'label: t("operations")');
  content = content.replace(/label: "AI INFRASTRUCTURE"/, 'label: t("ai_infrastructure")');
  content = content.replace(/label: "MANAGEMENT"/, 'label: t("management")');
  
  // Replace titles
  content = content.replace(/title: "Dashboard"/g, 'title: t("dashboard")');
  content = content.replace(/title: "Generate Video"/g, 'title: t("generate_video")');
  content = content.replace(/title: "Jobs"/g, 'title: t("jobs")');
  content = content.replace(/title: "Models"/g, 'title: t("models")');
  content = content.replace(/title: "Workers"/g, 'title: t("workers")');
  content = content.replace(/title: "Storage"/g, 'title: t("storage")');
  content = content.replace(/title: "Users"/g, 'title: t("users")');
  content = content.replace(/title: "Audit Logs"/g, 'title: t("audit_logs")');
  content = content.replace(/title: "Settings"/g, 'title: t("settings")');
  content = content.replace(/title: "Documentation"/g, 'title: t("documentation")');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Sidebar translated');
}
