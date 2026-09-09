import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useLocation, useNavigate } from 'react-router-dom';

const APP_HOSTS = new Set(['alsanusi.ly', 'www.alsanusi.ly']);
const ROOT_PATHS = new Set(['/', '/store']);

function isModifiedClick(event) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getAnchorFromEvent(event) {
  return event.target instanceof Element ? event.target.closest('a[href]') : null;
}

function dismissOpenOverlay() {
  const overlay = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]',
  );

  if (!overlay) return false;

  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    bubbles: true,
  }));
  return true;
}

async function hideLaunchScreen() {
  const fontsReady = document.fonts?.ready || Promise.resolve();
  const maximumWait = new Promise((resolve) => window.setTimeout(resolve, 1800));

  await Promise.race([fontsReady, maximumWait]);
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await SplashScreen.hide({ fadeOutDuration: 250 });
}

export default function NativeAppBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const [isOffline, setIsOffline] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!isNative) return undefined;

    document.documentElement.classList.add('capacitor-native');
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    hideLaunchScreen().catch(() => {});

    return () => {
      document.documentElement.classList.remove('capacitor-native');
    };
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return undefined;

    let isDisposed = false;
    const listenerHandles = [];

    Network.getStatus()
      .then((status) => {
        if (!isDisposed) setIsOffline(!status.connected);
      })
      .catch(() => {});

    const listenerPromises = [
      Network.addListener('networkStatusChange', (status) => {
        setIsOffline(!status.connected);
      }),
      App.addListener('backButton', () => {
        if (dismissOpenOverlay()) return;

        const historyIndex = Number(window.history.state?.idx || 0);
        if (historyIndex > 0) {
          navigate(-1);
          return;
        }

        if (!ROOT_PATHS.has(locationRef.current.pathname)) {
          navigate('/store', { replace: true });
          return;
        }

        App.exitApp();
      }),
      App.addListener('appUrlOpen', ({ url }) => {
        try {
          const destination = new URL(url);
          if (APP_HOSTS.has(destination.hostname)) {
            navigate(`${destination.pathname}${destination.search}${destination.hash}`);
          }
        } catch {
          // Ignore malformed deep links supplied by another application.
        }
      }),
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          window.dispatchEvent(new CustomEvent('alsanusi:app-resume'));
          Network.getStatus()
            .then((status) => setIsOffline(!status.connected))
            .catch(() => {});
        }
      }),
    ];

    Promise.all(listenerPromises)
      .then((handles) => {
        if (isDisposed) {
          handles.forEach((handle) => handle.remove());
          return;
        }
        listenerHandles.push(...handles);
      })
      .catch((error) => {
        console.warn('Unable to initialize one or more native app listeners.', error);
      });

    return () => {
      isDisposed = true;
      listenerHandles.forEach((handle) => handle?.remove());
    };
  }, [isNative, navigate]);

  useEffect(() => {
    if (!isNative) return undefined;

    const handleExternalLink = (event) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = getAnchorFromEvent(event);
      if (!anchor || anchor.hasAttribute('download')) return;

      let destination;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (['tel:', 'mailto:', 'sms:', 'whatsapp:'].includes(destination.protocol)) {
        event.preventDefault();
        AppLauncher.openUrl({ url: destination.href }).catch(() => {});
        return;
      }

      if (!['http:', 'https:'].includes(destination.protocol)) return;

      if (APP_HOSTS.has(destination.hostname)) {
        event.preventDefault();
        navigate(`${destination.pathname}${destination.search}${destination.hash}`);
        return;
      }

      if (destination.origin !== window.location.origin) {
        event.preventDefault();
        Browser.open({ url: destination.href }).catch(() => {
          AppLauncher.openUrl({ url: destination.href }).catch(() => {});
        });
      }
    };

    document.addEventListener('click', handleExternalLink, true);
    return () => document.removeEventListener('click', handleExternalLink, true);
  }, [isNative, navigate]);

  if (!isNative || !isOffline) return null;

  return (
    <div className="native-offline-banner" role="status" aria-live="polite">
      لا يوجد اتصال بالإنترنت. يمكنك تصفح المحتوى المحفوظ، وسنعاود الاتصال تلقائياً.
    </div>
  );
}
