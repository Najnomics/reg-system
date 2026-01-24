import ChapelList from '../../components/admin/ChapelList';
import RoleBasedRoute from '../../components/common/RoleBasedRoute';

const ChapelsPage = () => {
  return (
    <RoleBasedRoute
      allowedRoles={['admin', 'pastoral', 'reg-rep']}
      allowRegRepChapelAssign
    >
      <div className="space-y-6">
        <ChapelList />
      </div>
    </RoleBasedRoute>
  );
};

export default ChapelsPage;
