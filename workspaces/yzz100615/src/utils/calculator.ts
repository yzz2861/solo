import type {
  Cargo,
  VehicleParams,
  LoadStandard,
  AxleResult,
  CargoContribution,
  AdjustmentSuggestion,
} from '@/types';

export function calculateSingleCargoContribution(
  cargo: Cargo,
  wheelbase: number,
): { front: number; rear: number } {
  if (wheelbase <= 0) return { front: 0, rear: 0 };
  const rear = (cargo.weight * cargo.position) / wheelbase;
  const front = cargo.weight - rear;
  return { front, rear };
}

export function calculateCargoContributions(
  cargoes: Cargo[],
  wheelbase: number,
): CargoContribution[] {
  return cargoes.map((cargo) => {
    const { front, rear } = calculateSingleCargoContribution(cargo, wheelbase);
    return {
      cargoId: cargo.id,
      cargoName: cargo.name,
      weight: cargo.weight,
      frontContribution: front,
      rearContribution: rear,
      frontRatio: cargo.weight > 0 ? front / cargo.weight : 0,
      rearRatio: cargo.weight > 0 ? rear / cargo.weight : 0,
    };
  });
}

export function calculateAxleLoad(
  vehicleParams: VehicleParams,
  cargoes: Cargo[],
  standard: LoadStandard,
): AxleResult {
  const { wheelbase, emptyFrontAxle, emptyRearAxle } = vehicleParams;

  let frontCargo = 0;
  let rearCargo = 0;
  let totalCargo = 0;

  cargoes.forEach((cargo) => {
    const { front, rear } = calculateSingleCargoContribution(cargo, wheelbase);
    frontCargo += front;
    rearCargo += rear;
    totalCargo += cargo.weight;
  });

  const frontAxle = emptyFrontAxle + frontCargo;
  const rearAxle = emptyRearAxle + rearCargo;
  const totalWeight = emptyFrontAxle + emptyRearAxle + totalCargo;

  const frontMargin = standard.frontLimit - frontAxle;
  const rearMargin = standard.rearLimit - rearAxle;
  const totalMargin = standard.totalLimit - totalWeight;

  return {
    frontAxle,
    rearAxle,
    totalWeight,
    frontMargin,
    rearMargin,
    totalMargin,
    frontOverloaded: frontMargin < 0,
    rearOverloaded: rearMargin < 0,
    totalOverloaded: totalMargin < 0,
    frontRatio: standard.frontLimit > 0 ? frontAxle / standard.frontLimit : 0,
    rearRatio: standard.rearLimit > 0 ? rearAxle / standard.rearLimit : 0,
  };
}

export function generateAdjustmentSuggestions(
  cargoes: Cargo[],
  result: AxleResult,
  wheelbase: number,
  carriageLength: number,
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];

  if (cargoes.length === 0 || wheelbase <= 0) return suggestions;

  const sortedByPosition = [...cargoes].sort((a, b) => a.position - b.position);
  const heaviestFirst = [...cargoes].sort((a, b) => b.weight - a.weight);

  if (result.frontOverloaded) {
    const frontHeaviest = heaviestFirst
      .filter((c) => c.position < wheelbase * 0.5)
      .sort((a, b) => a.position - b.position)[0];

    if (frontHeaviest) {
      const overload = Math.abs(result.frontMargin);
      const suggestedDistance = (overload * wheelbase) / frontHeaviest.weight;
      const maxBack = carriageLength - frontHeaviest.position - frontHeaviest.width / 2;
      const actualDistance = Math.min(suggestedDistance, Math.max(0, maxBack));

      suggestions.push({
        type: 'front',
        cargoId: frontHeaviest.id,
        cargoName: frontHeaviest.name,
        direction: 'backward',
        suggestedDistance: Math.round(actualDistance),
        reason: `前轴超载 ${Math.abs(result.frontMargin).toFixed(0)} kg，将「${frontHeaviest.name}」后移约 ${Math.round(actualDistance)} mm 可缓解`,
      });
    }
  }

  if (result.rearOverloaded) {
    const rearHeaviest = heaviestFirst
      .filter((c) => c.position > wheelbase * 0.5)
      .sort((a, b) => b.position - a.position)[0];

    if (rearHeaviest) {
      const overload = Math.abs(result.rearMargin);
      const suggestedDistance = (overload * wheelbase) / rearHeaviest.weight;
      const maxForward = rearHeaviest.position - rearHeaviest.width / 2;
      const actualDistance = Math.min(suggestedDistance, Math.max(0, maxForward));

      suggestions.push({
        type: 'rear',
        cargoId: rearHeaviest.id,
        cargoName: rearHeaviest.name,
        direction: 'forward',
        suggestedDistance: Math.round(actualDistance),
        reason: `后轴超载 ${Math.abs(result.rearMargin).toFixed(0)} kg，将「${rearHeaviest.name}」前移约 ${Math.round(actualDistance)} mm 可缓解`,
      });
    }
  }

  if (result.totalOverloaded && !result.frontOverloaded && !result.rearOverloaded) {
    suggestions.push({
      type: 'total',
      cargoId: sortedByPosition[0]?.id || '',
      cargoName: '总重',
      direction: 'forward',
      suggestedDistance: 0,
      reason: `总重超载 ${Math.abs(result.totalMargin).toFixed(0)} kg，需要减少货物`,
    });
  }

  return suggestions;
}

export function checkCargoOutOfCarriage(
  cargo: Cargo,
  carriageLength: number,
  carriageOffset: number = 0,
): { outOfBounds: boolean; frontOver: number; rearOver: number } {
  const halfWidth = cargo.width / 2;
  const frontEdge = cargo.position - halfWidth + carriageOffset;
  const rearEdge = cargo.position + halfWidth + carriageOffset;

  const frontOver = frontEdge < 0 ? Math.abs(frontEdge) : 0;
  const rearOver = rearEdge > carriageLength ? rearEdge - carriageLength : 0;

  return {
    outOfBounds: frontOver > 0 || rearOver > 0,
    frontOver,
    rearOver,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const CARGO_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

export function getCargoColor(index: number): string {
  return CARGO_COLORS[index % CARGO_COLORS.length];
}
