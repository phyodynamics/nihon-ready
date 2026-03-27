export function LoadingScreen({ message = 'ခဏစောင့်ပါ...', subMessage = '' }) {
  return (
    <div className="loading-container">
      <img 
        src="/assets/logo.png" 
        alt="Nihon Ready" 
        style={{ width: 120, height: 'auto', animation: 'float 3s ease-in-out infinite' }}
      />
      <div className="loading-spinner"></div>
      <div className="loading-text">{message}</div>
      {subMessage && (
        <div style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>
          {subMessage}
        </div>
      )}
      <div className="loading-progress">
        <div className="loading-progress-bar"></div>
      </div>
    </div>
  );
}
