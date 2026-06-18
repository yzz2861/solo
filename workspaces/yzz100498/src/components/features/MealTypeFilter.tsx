import React from 'react';
import { MultiSelect } from '../ui/Select';
import { useFilterStore } from '../../store/useFilterStore';
import { MEAL_TYPE_LABELS, MealType } from '../../types';

export const MealTypeFilter: React.FC = () => {
  const { selectedMealTypes, setSelectedMealTypes } = useFilterStore();
  
  const options = (Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => ({
    value: type,
    label: MEAL_TYPE_LABELS[type]
  }));
  
  return (
    <MultiSelect
      label="选择餐次"
      options={options}
      selected={selectedMealTypes}
      onChange={setSelectedMealTypes}
      placeholder="全部餐次"
    />
  );
};
