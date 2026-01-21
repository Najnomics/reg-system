import { useAuth } from '../../contexts/AuthContext';
import ChariotList from '../../components/admin/ChariotList';
import RoleBasedRoute from '../../components/common/RoleBasedRoute';

const ChariotsPage = () => {
  return (
    <RoleBasedRoute adminOnly={true}>
      <div className="space-y-6">
        <ChariotList />
      </div>
    </RoleBasedRoute>
  );
};

export default ChariotsPage;
