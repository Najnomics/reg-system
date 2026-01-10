import { useState } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import { memberService } from '../../services/memberService';

const MemberList = ({ members, onEdit, loading }) => {
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);

  const handleDelete = async (member) => {
    if (window.confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}?`)) {
      setDeletingId(member.id);
      try {
        await memberService.deleteMember(member.id);
        window.location.reload();
      } catch (error) {
        alert(error.message);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleToggleStatus = async (member) => {
    const action = member.isActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${member.firstName} ${member.lastName}?`)) {
      setTogglingId(member.id);
      try {
        await memberService.toggleStatus(member.id);
        window.location.reload();
      } catch (error) {
        alert(error.message);
      } finally {
        setTogglingId(null);
      }
    }
  };

  const handleResendPin = async (member) => {
    if (window.confirm(`Resend PIN to ${member.firstName} ${member.lastName}?`)) {
      setSendingEmailId(member.id);
      try {
        await memberService.resendPin(member.id);
        alert('PIN sent successfully!');
      } catch (error) {
        alert(error.message);
      } finally {
        setSendingEmailId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No members found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PIN
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.dateOfBirth && (
                      <>DOB: {new Date(member.dateOfBirth).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm text-gray-900">{member.email}</div>
                  <div className="text-sm text-gray-500">{member.phoneNumber}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {member.pin}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  member.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {member.isActive ? (
                    <>
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-3 h-3 mr-1" />
                      Inactive
                    </>
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(member)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Edit member"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleResendPin(member)}
                    disabled={sendingEmailId === member.id}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    title="Resend PIN email"
                  >
                    {sendingEmailId === member.id ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full"></div>
                    ) : (
                      <EnvelopeIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleToggleStatus(member)}
                    disabled={togglingId === member.id}
                    className={`${
                      member.isActive 
                        ? 'text-red-600 hover:text-red-900' 
                        : 'text-green-600 hover:text-green-900'
                    } disabled:opacity-50`}
                    title={member.isActive ? 'Deactivate member' : 'Activate member'}
                  >
                    {togglingId === member.id ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-gray-600 rounded-full"></div>
                    ) : member.isActive ? (
                      <XCircleIcon className="h-4 w-4" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(member)}
                    disabled={deletingId === member.id}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    title="Delete member"
                  >
                    {deletingId === member.id ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-red-600 rounded-full"></div>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemberList;