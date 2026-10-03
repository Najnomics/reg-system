import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import NotificationContainer from '../common/NotificationContainer';

const ChariotLayout = () => {
  const { userType } = useAuth();

  if (!['chariot-leader', 'chariot-assistant', 'chapel-leader'].includes(userType)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationContainer />
    </div>
  );
};

export default ChariotLayout;
