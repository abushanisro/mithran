import { Injectable } from '@nestjs/common';
import { CreateShotWeightDto } from '../dto/shot-weight.dto';

/**
 * Shot Weight Calculation Engine
 *
 * Formulas:
 * 1. Runner Projected Area = π * (Runner Diameter / 2)^2
 * 2. Runner Projected Volume = Runner Projected Area * Runner Length
 * 3. Runner Weight = (Runner Projected Volume / 1000) * (Density / 1000)
 *    Converting mm^3 to cm^3 (divide by 1000) and kg/m^3 to g/cm^3 (divide by 1000)
 * 4. Total Part Weight = Part Weight * Number of Cavities
 * 5. Total Runner Weight = Runner Weight * Number of Cavities
 * 6. Total Shot Weight = Total Part Weight + Total Runner Weight
 * 7. Runner to Part Ratio = (Total Runner Weight / Total Part Weight) * 100
 * 8. Sprue Weight = (π * (Sprue Diameter / 2)^2 * Sprue Length / 1000) * (Density / 1000)
 * 9. Total Shot Weight with Sprue = Total Shot Weight + Sprue Weight + Cold Slug Weight
 */

export interface ShotWeightCalculationResult {
  // Runner calculations
  runnerProjectedAreaPerPart: number;
  runnerProjectedVolumePerPart: number;
  runnerWeightPerPart: number;

  // Total calculations
  totalPartWeight: number;
  totalRunnerWeight: number;
  totalShotWeight: number;
  runnerToPartRatio: number;

  // Sprue calculations (optional)
  sprueWeight?: number;
  totalShotWeightWithSprue?: number;
}

@Injectable()
export class ShotWeightCalculationEngine {
  /**
   * Main calculation method
   */
  calculate(dto: CreateShotWeightDto): ShotWeightCalculationResult {
    // 1. Calculate Runner Projected Area (mm^2)
    const runnerRadius = dto.runnerDiameter / 2;
    const runnerProjectedAreaPerPart = Math.PI * Math.pow(runnerRadius, 2);

    // 2. Calculate Runner Projected Volume (mm^3)
    const runnerProjectedVolumePerPart = runnerProjectedAreaPerPart * dto.runnerLengthPerPart;

    // 3. Calculate Runner Weight per Part (grams)
    // Convert: mm^3 → cm^3 (÷1000), kg/m^3 → g/cm^3 (÷1000)
    // Weight (g) = Volume (cm^3) * Density (g/cm^3)
    const runnerWeightPerPart = (runnerProjectedVolumePerPart / 1000) * (dto.density / 1000);

    // 4. Calculate Total Part Weight
    const totalPartWeight = dto.partWeight * dto.numberOfCavities;

    // 5. Calculate Total Runner Weight
    const totalRunnerWeight = runnerWeightPerPart * dto.numberOfCavities;

    // 6. Calculate Total Shot Weight
    const totalShotWeight = totalPartWeight + totalRunnerWeight;

    // 7. Calculate Runner to Part Ratio
    const runnerToPartRatio = totalPartWeight > 0
      ? (totalRunnerWeight / totalPartWeight) * 100
      : 0;

    const result: ShotWeightCalculationResult = {
      runnerProjectedAreaPerPart: this.roundTo4Decimals(runnerProjectedAreaPerPart),
      runnerProjectedVolumePerPart: this.roundTo4Decimals(runnerProjectedVolumePerPart),
      runnerWeightPerPart: this.roundTo4Decimals(runnerWeightPerPart),
      totalPartWeight: this.roundTo4Decimals(totalPartWeight),
      totalRunnerWeight: this.roundTo4Decimals(totalRunnerWeight),
      totalShotWeight: this.roundTo4Decimals(totalShotWeight),
      runnerToPartRatio: this.roundTo4Decimals(runnerToPartRatio),
    };

    // 8. Calculate Sprue Weight (if included)
    if (dto.includeSprue && dto.sprueDiameter && dto.sprueLength) {
      const sprueRadius = dto.sprueDiameter / 2;
      const sprueVolume = Math.PI * Math.pow(sprueRadius, 2) * dto.sprueLength;
      result.sprueWeight = this.roundTo4Decimals((sprueVolume / 1000) * (dto.density / 1000));

      // 9. Calculate Total Shot Weight with Sprue and Cold Slug
      result.totalShotWeightWithSprue = this.roundTo4Decimals(
        totalShotWeight +
        result.sprueWeight +
        (dto.coldSlugWeight || 0)
      );
    }

    return result;
  }

  /**
   * Validate calculation inputs
   */
  validateInputs(dto: CreateShotWeightDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (dto.density <= 0) {
      errors.push('Density must be greater than 0');
    }

    if (dto.volume <= 0) {
      errors.push('Volume must be greater than 0');
    }

    if (dto.partWeight <= 0) {
      errors.push('Part weight must be greater than 0');
    }

    if (dto.numberOfCavities <= 0) {
      errors.push('Number of cavities must be at least 1');
    }

    if (dto.runnerDiameter <= 0) {
      errors.push('Runner diameter must be greater than 0');
    }

    if (dto.runnerLengthPerPart <= 0) {
      errors.push('Runner length must be greater than 0');
    }

    if (dto.includeSprue) {
      if (!dto.sprueDiameter || dto.sprueDiameter <= 0) {
        errors.push('Sprue diameter must be greater than 0 when sprue is included');
      }
      if (!dto.sprueLength || dto.sprueLength <= 0) {
        errors.push('Sprue length must be greater than 0 when sprue is included');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper method to round to 4 decimal places
   */
  private roundTo4Decimals(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  /**
   * Get recommended runner diameter based on part weight (lookup table logic)
   * This can be customized based on your lookup tables
   */
  getRecommendedRunnerDiameter(partWeight: number): number {
    if (partWeight < 10) return 4;
    if (partWeight < 50) return 6;
    if (partWeight < 100) return 8;
    if (partWeight < 200) return 10;
    if (partWeight < 500) return 12;
    return 15;
  }

  /**
   * Estimate runner length based on number of cavities and layout
   * This is a simplified formula - adjust based on actual mold layouts
   */
  estimateRunnerLength(numberOfCavities: number, runnerDiameter: number): number {
    // Base length + additional length per cavity
    const baseLength = 50; // mm
    const lengthPerCavity = 25; // mm
    return baseLength + (numberOfCavities * lengthPerCavity);
  }

  /**
   * Validate part weight against volume and density
   * Part Weight (g) = Volume (mm^3) * Density (kg/m^3) / 10^6
   */
  validatePartWeightAgainstVolume(
    volume: number,
    density: number,
    partWeight: number
  ): { valid: boolean; calculatedWeight: number; deviation: number } {
    // Convert: mm^3 → cm^3 (÷1000), kg/m^3 → g/cm^3 (÷1000)
    const calculatedWeight = (volume / 1000) * (density / 1000);
    const deviation = Math.abs((partWeight - calculatedWeight) / calculatedWeight) * 100;

    return {
      valid: deviation < 10, // Allow 10% deviation
      calculatedWeight: this.roundTo4Decimals(calculatedWeight),
      deviation: this.roundTo4Decimals(deviation),
    };
  }
}
