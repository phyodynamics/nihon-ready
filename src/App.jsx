import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { isTelegramEnv, getTelegramUser, initTelegramApp, isAdmin } from './lib/telegram';
import { getUser, createUser, getGeneratedContent, getPayment } from './lib/database';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { NotTelegramScreen } from './components/NotTelegramScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { GeneratingScreen } from './components/GeneratingScreen';
import { MainScreen } from './components/MainScreen';
import { PaymentScreen } from './components/PaymentScreen';
import { AdminDashboard } from './components/AdminDashboard';
import './index.css';

function AppContent() {
  const { state, dispatch, showToast } = useApp();

  useEffect(() => {
    initApp();
  }, []);

  // Poll for payment approval
  useEffect(() => {
    if (state.paymentStatus === 'pending' && state.user?.id) {
      const interval = setInterval(async () => {
        try {
          const dbUser = await getUser(state.user.id);
          if (dbUser?.is_paid) {
            dispatch({ type: 'SET_PAID', payload: true });
            dispatch({ type: 'SET_DB_USER', payload: dbUser });
            dispatch({ type: 'SET_PAYMENT_STATUS', payload: 'approved' });
            showToast('Content Unlocked!');
          }
        } catch (e) {
          // Ignore errors during polling
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [state.paymentStatus, state.user?.id]);

  async function initApp() {
    try {
      // Check Telegram environment
      const inTelegram = isTelegramEnv();

      // In development, allow access even without Telegram
      const isDev = import.meta.env.DEV;

      if (!inTelegram && !isDev) {
        dispatch({ type: 'SET_SCREEN', payload: 'not-telegram' });
        return;
      }

      // Initialize Telegram WebApp
      if (inTelegram) {
        initTelegramApp();
      }

      // Get user data
      let user = getTelegramUser();

      // In development, use mock user
      if (!user && isDev) {
        user = {
          id: 1827344905, // Admin ID for testing
          firstName: 'Dev',
          lastName: 'User',
          username: 'devuser',
          languageCode: 'my',
          photoUrl: ''
        };
      }

      if (!user) {
        dispatch({ type: 'SET_SCREEN', payload: 'not-telegram' });
        return;
      }

      dispatch({ type: 'SET_USER', payload: user });

      // Check if admin
      if (isAdmin(user.id)) {
        // Admin can access dashboard
      }

      // Check database for existing user
      let dbUser = await getUser(user.id);

      if (!dbUser) {
        // New user - create and show welcome
        dbUser = await createUser(user);
        dispatch({ type: 'SET_DB_USER', payload: dbUser });
        dispatch({ type: 'SET_SCREEN', payload: 'welcome' });
        return;
      }

      dispatch({ type: 'SET_DB_USER', payload: dbUser });

      // Check for existing generated content
      const existingContent = await getGeneratedContent(user.id, 'first');

      if (existingContent) {
        dispatch({
          type: 'SET_GENERATED_CONTENT',
          payload: { type: 'first', data: existingContent.content }
        });

        // Check payment status
        if (dbUser.is_paid) {
          dispatch({ type: 'SET_PAID', payload: true });
        } else {
          const payment = await getPayment(user.id, 'unlock');
          if (payment?.status === 'pending') {
            dispatch({ type: 'SET_PAYMENT_STATUS', payload: 'pending' });
          }
        }

        // Load onboarding data for potential regeneration
        dispatch({ type: 'SET_SCREEN', payload: 'main' });
      } else {
        // Has account but no content yet
        dispatch({ type: 'SET_SCREEN', payload: 'welcome' });
      }
    } catch (error) {
      console.error('Init error:', error);
      // In dev mode, still show welcome
      if (import.meta.env.DEV) {
        dispatch({ type: 'SET_SCREEN', payload: 'welcome' });
      } else {
        showToast('App ဖွင့်၍ မရပါ', 'error');
      }
    }
  }

  // Render based on current screen
  const renderScreen = () => {
    switch (state.screen) {
      case 'loading':
        return <LoadingScreen />;
      case 'not-telegram':
        return <NotTelegramScreen />;
      case 'welcome':
        return <WelcomeScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'generating':
        return <GeneratingScreen />;
      case 'main':
        return <MainScreen />;
      case 'payment':
        return <PaymentScreen />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <LoadingScreen />;
    }
  };

  return (
    <div className="app-container">
      <Toast />
      {renderScreen()}

      {/* Admin FAB - only for admin users */}
      {state.user && isAdmin(state.user.id) && state.screen !== 'admin' && state.screen !== 'loading' && (
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'admin' })}
          style={{
            position: 'fixed',
            bottom: state.screen === 'main' ? 80 : 24,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--black)',
            color: 'var(--white)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            transition: 'var(--transition)'
          }}
          title="Admin Dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
