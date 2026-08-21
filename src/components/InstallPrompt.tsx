import React, { useState, useEffect } from 'react';

const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Проверяем, показывали ли уже подсказку
    const hasSeenPrompt = localStorage.getItem('installPromptShown');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    if (hasSeenPrompt || isInstalled) {
      return;
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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
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
          Установить Daily Note
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
          Быстрый доступ к вашему дневнику
        </p>
      </div>
      <button
        onClick={handleInstall}
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
        Установить
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
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  );
};

export default InstallPrompt;
