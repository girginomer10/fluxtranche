'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function LanguageSwitcher() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const switchLanguage = (newLocale: string) => {
    const segments = pathname.split('/');
    
    // Remove current locale if it exists
    if (segments[1] === locale) {
      segments.splice(1, 1);
    }
    
    // Add new locale if it's not the default
    if (newLocale !== 'en') {
      segments.splice(1, 0, newLocale);
    }
    
    const newPath = segments.join('/') || '/';
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <GlobeAltIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.name}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => switchLanguage(language.code)}
                  className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                    locale === language.code 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  <span className="mr-3">{language.flag}</span>
                  {language.name}
                  {locale === language.code && (
                    <span className="ml-auto text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}