import type { BufferInput, BufferResult } from '@/types';
import { concentrationToMolL, volumeToL, lToML } from './convert';
import { validate } from './validate';
import { generateSteps } from './steps';

export function calculate(input: BufferInput): BufferResult {
  const warnings = validate(input);

  const C_acid = concentrationToMolL(input.acidConcentration, input.acidConcentrationUnit);
  const C_base = concentrationToMolL(input.baseConcentration, input.baseConcentrationUnit);
  const V_total_L = volumeToL(input.targetVolume, input.targetVolumeUnit);
  const V_total_mL = lToML(V_total_L);

  const ratio = Math.pow(10, input.targetPH - input.pKa);

  const V_acid_L = V_total_L * C_base / (C_base + ratio * C_acid);
  const V_base_L = V_total_L * ratio * C_acid / (C_base + ratio * C_acid);
  const V_water_L = V_total_L - V_acid_L - V_base_L;

  const V_acid_mL = lToML(V_acid_L);
  const V_base_mL = lToML(V_base_L);
  const V_water_mL = lToML(V_water_L);

  const finalAcidConc = C_acid * V_acid_L / V_total_L;
  const finalBaseConc = C_base * V_base_L / V_total_L;

  const beta = 2.303 * finalAcidConc * finalBaseConc / (finalAcidConc + finalBaseConc);

  const steps = generateSteps(input, {
    C_acid,
    C_base,
    V_total_L,
    V_total_mL,
    ratio,
    V_acid_L,
    V_base_L,
    V_water_L,
    V_acid_mL,
    V_base_mL,
    V_water_mL,
    finalAcidConc,
    finalBaseConc,
    beta,
  });

  return {
    ratio,
    acidVolume_mL: V_acid_mL,
    baseVolume_mL: V_base_mL,
    waterVolume_mL: V_water_mL,
    totalVolume_mL: V_total_mL,
    finalAcidConc_molL: finalAcidConc,
    finalBaseConc_molL: finalBaseConc,
    bufferCapacity: beta,
    warnings,
    steps,
  };
}
