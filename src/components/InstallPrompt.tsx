import React, { useState, useEffect } from 'react';
import type { Lang } from '../i18n';
import { makeUI } from '../ui-strings';
import { makePwa } from '../pwa-strings';
import { needsIosInstall } from '../lib/pwa';
import IosInstallGuide from './IosInstallGuide';

const InstallPrompt: React.FC<{ lang: Lang }> = ({ lang }) => {
  const u = makeUI(lang);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const ios = needsIosInstall();
  const p = makePwa(lang);

  useEffect(() => {
    // Проверяем, показывали ли уже подсказку
    const hasSeenPrompt = localStorage.getItem('installPromptShown');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    if (hasSeenPrompt || isInstalled) {
      return;
    }

    // iPhone/iPad: события beforeinstallprompt нет, поэтому показываем свою подсказку с шагами
    if (needsIosInstall()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('installPromptShown', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Обработчик события beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Показываем подсказку через 5 секунд
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('installPromptShown', 'true');
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Пользователь принял установку PWA');
    }
    
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptShown', 'true');
  };

  if (!showPrompt) return null;
  if (showGuide) return <IosInstallGuide lang={lang} onClose={() => { setShowGuide(false); setShowPrompt(false); }} />;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2d6a4f',
        color: '#ffffff',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '90%',
        width: '400px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
          {ios ? p('iosTitle') : u('installTitle')}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
          {ios ? p('iosSub') : u('installSub')}
        </p>
      </div>
      <button
        onClick={ios ? () => setShowGuide(true) : handleInstall}
        style={{
          backgroundColor: '#ffffff',
          color: '#2d6a4f',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {ios ? p('iosHow') : u('install')}
      </button>
      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px 8px',
          opacity: 0.8,
        }}
        aria-label={u('close')}
      >
        ×
      </button>
    </div>
  );
};

export default InstallPrompt;
