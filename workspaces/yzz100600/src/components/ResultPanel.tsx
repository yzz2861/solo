import type { CalculationResult, InputParams } from '@/types/water-tower';
import { useWaterStore } from '@/store/useWaterStore';
import EngineerView from './EngineerView';
import SupervisorView from './SupervisorView';

interface Props {
  params: InputParams;
  result: CalculationResult;
}

const ResultPanel = ({ params, result }: Props) => {
  const { viewMode } = useWaterStore();
  return viewMode === 'engineer' ? (
    <EngineerView params={params} result={result} />
  ) : (
    <SupervisorView params={params} result={result} />
  );
};

export default ResultPanel;
