import { useAuth } from '../../contexts/AuthContext';
import RegRepList from '../../components/admin/RegRepList';
import RoleBasedRoute from '../../components/common/RoleBasedRoute';

const RegRepsPage = () => {
  return (
    <RoleBasedRoute adminOnly={true}>
      <div className="space-y-6">
        <RegRepList />
      </div>
    </RoleBasedRoute>
  );
};

export default RegRepsPage;