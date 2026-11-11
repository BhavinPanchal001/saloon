export const findContractConflicts = (contracts, candidate) => {
  if (!candidate.employeeId || !candidate.startDate || (candidate.status && candidate.status !== 'active')) return [];
  return contracts.filter(contract => contract.status === 'active'
    && String(contract.employeeId) === String(candidate.employeeId)
    && (!candidate.id || String(contract.id) !== String(candidate.id))
    && contract.startDate <= (candidate.endDate || '9999-12-31')
    && candidate.startDate <= (contract.endDate || '9999-12-31'));
};

export const revisionCandidates = (conflicts, effectiveDate) => conflicts.filter(contract => contract.startDate < effectiveDate
  && (!contract.endDate || contract.endDate >= effectiveDate));

export const previousContractEnd = effectiveDate => new Date(Date.parse(effectiveDate) - 86400000).toISOString().slice(0, 10);
