
'use client';

import { useLanguage } from '@/context/language-context';
import { Button } from '@/modules/shared/components/ui/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'th' : 'en');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage} className="w-12">
      {language.toUpperCase()}
    </Button>
  );
}


