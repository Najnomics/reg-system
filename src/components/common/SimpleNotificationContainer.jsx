import { useApp } from '../../contexts/SimpleAppContext';

const SimpleNotificationContainer = () => {
  const { notifications, removeNotification } = useApp();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-50 px-4 flex flex-col gap-2 sm:gap-4 sm:left-auto sm:right-4 sm:px-0 sm:items-end">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`w-full max-w-full sm:max-w-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200'
              : notification.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'error' ? (
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : notification.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1 pt-0.5">
                <p className={`text-sm font-medium ${
                  notification.type === 'error'
                    ? 'text-red-800'
                    : notification.type === 'success'
                    ? 'text-green-800'
                    : 'text-blue-800'
                } break-words`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className={`rounded-md inline-flex ${
                    notification.type === 'error'
                      ? 'text-red-400 hover:text-red-500'
                      : notification.type === 'success'
                      ? 'text-green-400 hover:text-green-500'
                      : 'text-blue-400 hover:text-blue-500'
                  } focus:outline-none`}
                  onClick={() => removeNotification(notification.id)}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimpleNotificationContainer;
