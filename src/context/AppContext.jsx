import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  screen: 'loading', // loading, not-telegram, welcome, onboarding, generating, main, payment, admin
  user: null,
  dbUser: null,
  onboardingData: {},
  generatedContent: {
    first: null,  // self-intro, vocab, 45 questions, 4 answers
    second: {},   // batched answers (10 at a time)
    third: null,  // experiences, mindset, manners
    mentor: null  // AI master prompt
  },
  currentOnboardingStep: 0,
  isLoading: false,
  toast: null,
  activeTab: 'intro', // intro, questions, experiences, mentor
  isPaid: false,
  paymentStatus: null, // null, pending, approved
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_DB_USER':
      return { ...state, dbUser: action.payload, isPaid: action.payload?.is_paid || false };
    case 'SET_ONBOARDING_DATA':
      return { ...state, onboardingData: { ...state.onboardingData, ...action.payload } };
    case 'SET_ONBOARDING_STEP':
      return { ...state, currentOnboardingStep: action.payload };
    case 'SET_GENERATED_CONTENT':
      return {
        ...state,
        generatedContent: {
          ...state.generatedContent,
          [action.payload.type]: action.payload.data
        }
      };
    case 'SET_SECOND_BATCH':
      return {
        ...state,
        generatedContent: {
          ...state.generatedContent,
          second: {
            ...state.generatedContent.second,
            [action.payload.batchNumber]: action.payload.data
          }
        }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_PAID':
      return { ...state, isPaid: action.payload };
    case 'SET_PAYMENT_STATUS':
      return { ...state, paymentStatus: action.payload };
    case 'RESET_ONBOARDING':
      return { ...state, onboardingData: {}, currentOnboardingStep: 0, generatedContent: { first: null, second: {}, third: null, mentor: null } };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const showToast = useCallback((message, type = 'success') => {
    dispatch({ type: 'SET_TOAST', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'SET_TOAST', payload: null }), 3000);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
