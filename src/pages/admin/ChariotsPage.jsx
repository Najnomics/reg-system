import ChariotList from '../../components/admin/ChariotList';
import RoleBasedRoute from '../../components/common/RoleBasedRoute';

const ChariotsPage = () => {
  return (
    <RoleBasedRoute allowedRoles={['admin', 'pastoral']}>
      <div className="space-y-6">
        <ChariotList />
      </div>
    </RoleBasedRoute>
  );
};

export default ChariotsPage;
