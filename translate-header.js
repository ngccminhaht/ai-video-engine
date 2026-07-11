const fs = require('fs');

const file = 'apps/web/src/components/layout/header.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTranslations')) {
  content = content.replace(/import \{ Search, Bell, Settings \} from "lucide-react";/, 'import { Search, Bell, Settings } from "lucide-react";\nimport { useTranslations } from "next-intl";');
  content = content.replace(/export function Header\(\) \{/, 'export function Header() {\n  const t = useTranslations("Header");');
  
  content = content.replace(/placeholder="Search anything..."/g, 'placeholder={t("search_placeholder")}');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Header translated');
}
