import { useState } from 'react';
import { format, subDays } from 'date-fns';

const ReportFilters = ({ filters, onChange, sessions = [], members = [] }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      sessionId: '',
      memberId: ''
    };
    setLocalFilters(resetFilters);
    onChange(resetFilters);
  };

  const presetRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 3 months', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'This year', days: 365 }
  ];

  const handlePresetRange = (days) => {
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');
    
    const newFilters = {
      ...localFilters,
      startDate,
      endDate
    };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Date Range</h4>
        
        {/* Preset Ranges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presetRanges.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetRange(preset.days)}
              className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={localFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={localFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Session Filter */}
      <div>
        <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Session
        </label>
        <select
          id="sessionId"
          value={localFilters.sessionId}
          onChange={(e) => handleFilterChange('sessionId', e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">All Sessions</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.theme} - {format(new Date(session.startTime), 'MMM dd, yyyy')}
            </option>
          ))}
        </select>
      </div>

      {/* Member Filter */}
      <div>
        <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Member
        </label>
        <select
          id="memberId"
          value={localFilters.memberId}
          onChange={(e) => handleFilterChange('memberId', e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">All Members</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;