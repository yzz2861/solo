import React from 'react';
import { MultiSelect } from '../ui/Select';
import { useFilterStore } from '../../store/useFilterStore';
import { useDataStore } from '../../store/useDataStore';

export const WardFilter: React.FC = () => {
  const { wards } = useDataStore();
  const { selectedWards, setSelectedWards } = useFilterStore();
  
  const options = wards.map(w => ({ value: w.id, label: w.name }));
  
  return (
    <MultiSelect
      label="选择病区"
      options={options}
      selected={selectedWards}
      onChange={setSelectedWards}
      placeholder="全部病区"
    />
  );
};
