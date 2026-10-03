export const formatDateRange = (start, end, { year = true } = {}) => {
  if (!start && !end) return null;
  const fmt = (d, withYear) =>
    new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  if (start && end) return `${fmt(start, false)} – ${fmt(end, year)}`;
  return fmt(start || end, year);
};

export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const formatNumber = (value) => Number(value || 0).toLocaleString('en-GB');
