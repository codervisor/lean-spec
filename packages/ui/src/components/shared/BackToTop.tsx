import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation('common');

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
      aria-label={t('actions.backToTop')}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
