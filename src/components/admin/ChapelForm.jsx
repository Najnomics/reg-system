import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const schema = yup.object({
  name: yup.string().required('Chapel name is required').min(2, 'Name must be at least 2 characters'),
  description: yup.string().max(500, 'Description must not exceed 500 characters'),
  leaderId: yup.string().required('Leader is required').uuid('Invalid leader selection'),
  subLeaderId: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .test('is-uuid', 'Invalid subleader selection', (value) => {
      if (!value) return true;
      return yup.string().uuid().isValidSync(value);
    }),
});

const ChapelForm = ({ chapel = null, onSubmit, onClose, loading = false }) => {
  const isEdit = !!chapel;
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showLeaderSearch, setShowLeaderSearch] = useState(false);
  const [showSubLeaderSearch, setShowSubLeaderSearch] = useState(false);
  const [leaderSearchTerm, setLeaderSearchTerm] = useState('');
  const [subLeaderSearchTerm, setSubLeaderSearchTerm] = useState('');
  const [excludedIds, setExcludedIds] = useState(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: chapel?.name || '',
      description: chapel?.description || '',
      leaderId: chapel?.leaderId || '',
      subLeaderId: chapel?.subLeaderId || '',
    },
  });

  const selectedLeaderId = watch('leaderId');
  const selectedSubLeaderId = watch('subLeaderId');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const [membersResponse, chapelsResponse] = await Promise.all([
        (async () => {
          let allMembersList = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const response = await apiService.getMembers({ page, limit: 100 });
            const pageMembers = response?.data?.members || [];
            allMembersList = [...allMembersList, ...pageMembers];

            hasMore = pageMembers.length === 100 && (response?.data?.pagination?.hasNext || false);
            page++;

            if (page > 50) break;
          }

          return allMembersList;
        })(),
        apiService.getChapels().catch(() => ({ data: { chapels: [] } })),
      ]);

      const excluded = new Set();
      chapelsResponse?.data?.chapels?.forEach(existingChapel => {
        if (isEdit && existingChapel.id === chapel?.id) {
          return;
        }
        if (existingChapel.leaderId) excluded.add(existingChapel.leaderId);
        if (existingChapel.subLeaderId) excluded.add(existingChapel.subLeaderId);
        if (existingChapel.workers) {
          existingChapel.workers.forEach(worker => excluded.add(worker.memberId));
        }
      });

      setExcludedIds(excluded);
      setMembers(membersResponse);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleFormSubmit = (data) => {
    if (!data.subLeaderId) {
      data.subLeaderId = null;
    }
    onSubmit(data);
  };

  const handleSelectLeader = (member) => {
    setValue('leaderId', member.id, { shouldValidate: true });
    setShowLeaderSearch(false);
    setLeaderSearchTerm('');
  };

  const handleSelectSubLeader = (member) => {
    setValue('subLeaderId', member.id, { shouldValidate: true });
    setShowSubLeaderSearch(false);
    setSubLeaderSearchTerm('');
  };

  const selectedLeader = members.find(m => m.id === selectedLeaderId);
  const selectedSubLeader = members.find(m => m.id === selectedSubLeaderId);

  const getFilteredMembers = (searchTerm, excludedSet) => {
    const term = searchTerm.toLowerCase();
    return members.filter(member => {
      if (excludedSet.has(member.id)) return false;
      return (
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
      );
    });
  };

  const leaderExcludedIds = new Set(excludedIds);
  if (selectedSubLeaderId) leaderExcludedIds.add(selectedSubLeaderId);

  const subLeaderExcludedIds = new Set(excludedIds);
  if (selectedLeaderId) subLeaderExcludedIds.add(selectedLeaderId);

  const filteredLeaders = getFilteredMembers(leaderSearchTerm, leaderExcludedIds);
  const filteredSubLeaders = getFilteredMembers(subLeaderSearchTerm, subLeaderExcludedIds);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit ? 'Edit Chapel' : 'Create Chapel'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Chapel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter chapel name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leader <span className="text-red-500">*</span>
            </label>
            {selectedLeader ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedLeader.name}</p>
                  <p className="text-xs text-gray-600">{selectedLeader.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('leaderId', '');
                    setShowLeaderSearch(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={leaderSearchTerm}
                  onChange={(e) => {
                    setLeaderSearchTerm(e.target.value);
                    setShowLeaderSearch(true);
                  }}
                  onFocus={() => setShowLeaderSearch(true)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search for leader..."
                />
                {showLeaderSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : filteredLeaders.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No members found</div>
                    ) : (
                      filteredLeaders.slice(0, 10).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectLeader(member)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <input type="hidden" {...register('leaderId')} />
            {errors.leaderId && (
              <p className="mt-1 text-sm text-red-600">{errors.leaderId.message}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subleader (Optional)
            </label>
            {selectedSubLeader ? (
              <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedSubLeader.name}</p>
                  <p className="text-xs text-gray-600">{selectedSubLeader.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('subLeaderId', '');
                    setShowSubLeaderSearch(true);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={subLeaderSearchTerm}
                  onChange={(e) => {
                    setSubLeaderSearchTerm(e.target.value);
                    setShowSubLeaderSearch(true);
                  }}
                  onFocus={() => setShowSubLeaderSearch(true)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search for subleader..."
                />
                {showSubLeaderSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : filteredSubLeaders.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No members found</div>
                    ) : (
                      filteredSubLeaders.slice(0, 10).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectSubLeader(member)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedSubLeader && (
              <button
                type="button"
                onClick={() => setValue('subLeaderId', '')}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear subleader
              </button>
            )}
            <input type="hidden" {...register('subLeaderId')} />
            {errors.subLeaderId && (
              <p className="mt-1 text-sm text-red-600">{errors.subLeaderId.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
      {(showLeaderSearch || showSubLeaderSearch) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowLeaderSearch(false);
            setShowSubLeaderSearch(false);
          }}
        />
      )}
    </div>
  );
};

export default ChapelForm;
