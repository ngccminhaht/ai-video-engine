const fs = require('fs');

const file = 'apps/web/src/app/(admin)/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTranslations')) {
  content = content.replace(/export default function DashboardPage\(\) \{/, 'import { useTranslations } from "next-intl";\nexport default function DashboardPage() {\n  const t = useTranslations("Dashboard");');
  
  content = content.replace(/>Dashboard<\/h1>/g, '>{t("title")}</h1>');
  content = content.replace(/>Overview of your AI Video generation system<\/p>/g, '>{t("subtitle")}</p>');
  content = content.replace(/>Loading...<\/p>/g, '>{t("subtitle")}</p>');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Dashboard page translated');
}
