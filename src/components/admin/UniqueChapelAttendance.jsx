const ROLE_COLS = [
  { key: 'CHAPEL_LEADER', label: 'Leaders' },
  { key: 'SUB_LEADER', label: 'Sub-leaders' },
  { key: 'WORKER', label: 'Workers' },
  { key: 'MEMBER', label: 'Members' },
  { key: 'INVITEE', label: 'Invitees' },
  { key: 'NONE', label: 'No role' },
];

const UniqueChapelAttendance = ({ uniqueTotal = 0, uniqueByChapel = [] }) => {
  if (!uniqueTotal && !uniqueByChapel.length) return null;

  const totals = uniqueByChapel.reduce((acc, row) => {
    acc.total += row.total || 0;
    ROLE_COLS.forEach(({ key }) => {
      acc[key] += row[key] || 0;
    });
    return acc;
  }, { total: 0, CHAPEL_LEADER: 0, SUB_LEADER: 0, WORKER: 0, MEMBER: 0, INVITEE: 0, NONE: 0 });

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Unique people at this event</h3>
        <p className="mt-1 text-sm text-gray-500">
          {uniqueTotal} people have checked in on at least one conference day. Each person is counted once.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 sm:px-4 py-2 text-left font-medium text-gray-600">Chapel</th>
              <th className="px-3 sm:px-4 py-2 text-right font-medium text-gray-600">Unique</th>
              {ROLE_COLS.map((col) => (
                <th key={col.key} className="px-3 sm:px-4 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uniqueByChapel.map((row) => (
              <tr key={row.name} className="hover:bg-gray-50">
                <td className="px-3 sm:px-4 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-3 sm:px-4 py-2 text-right font-semibold text-indigo-700">{row.total}</td>
                {ROLE_COLS.map((col) => (
                  <td key={col.key} className="px-3 sm:px-4 py-2 text-right text-gray-700">
                    {row[col.key] || 0}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-indigo-50 font-semibold">
              <td className="px-3 sm:px-4 py-2 text-gray-900">All chapels</td>
              <td className="px-3 sm:px-4 py-2 text-right text-indigo-800">{totals.total || uniqueTotal}</td>
              {ROLE_COLS.map((col) => (
                <td key={col.key} className="px-3 sm:px-4 py-2 text-right text-gray-900">
                  {totals[col.key] || 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UniqueChapelAttendance;
