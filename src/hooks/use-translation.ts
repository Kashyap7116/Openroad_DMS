
'use client';

import { useLanguage } from '@/context/language-context';
import { useCallback } from 'react';

// A simple translation map. In a real app, this would be more sophisticated.
const translations: Record<string, Record<string, string>> = {
  Dashboard: { th: 'แดชบอร์ด' },
  Purchase: { th: 'จัดซื้อ' },
  Sales: { th: 'การขาย' },
  Finance: { th: 'การเงิน' },
  Maintenance: { th: 'ซ่อมบำรุง' },
  HR: { th: 'ฝ่ายบุคคล' },
  Employees: { th: 'พนักงาน' },
  Attendance: { th: 'การเข้างาน' },
  Payroll: { th: 'บัญชีเงินเดือน' },
  Reports: { th: 'รายงาน' },
  Alerts: { th: 'การแจ้งเตือน' },
  Admin: { th: 'ผู้ดูแลระบบ' },
  Users: { th: 'ผู้ใช้งาน' },
  Roles: { th: 'บทบาท' },
  Logs: { th: 'บันทึกกิจกรรม' },
  'My Account': {th: 'บัญชีของฉัน'},
  Settings: {th: 'ตั้งค่า'},
  Support: {th: 'สนับสนุน'},
  Logout: {th: 'ออกจากระบบ'},
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = useCallback((key: string) => {
    if (language === 'th' && translations[key]) {
      return translations[key].th || key;
    }
    return key;
  }, [language]);

  return { language, t };
};

    