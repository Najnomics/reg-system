const LEADER_ROLES = ['CHAPEL_LEADER', 'SUB_LEADER'];

const isLeaderRole = (role) => LEADER_ROLES.includes(role);

module.exports = { LEADER_ROLES, isLeaderRole };
