import { useApp } from '../context/AppContext';

export function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${state.toast.type}`}>
        {state.toast.message}
      </div>
    </div>
  );
}
