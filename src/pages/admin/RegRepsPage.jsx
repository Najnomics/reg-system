import { useAuth } from '../../contexts/AuthContext';
import RegRepList from '../../components/admin/RegRepList';
import RoleBasedRoute from '../../components/common/RoleBasedRoute';

const RegRepsPage = () => {
  return (
    <RoleBasedRoute adminOnly={true}>
      <div className="w-full max-w-full overflow-x-hidden">
        <RegRepList />
      </div>
    </RoleBasedRoute>
  );
};

export default RegRepsPage;