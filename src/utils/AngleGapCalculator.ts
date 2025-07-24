import { PartAngles } from '../types';

export class AngleGapCalculator {
  /**
   * Calculate the gap length created by an angled cut
   * @param thickness - The thickness of the material in mm
   * @param angle - The angle of the cut in degrees (0-90)
   * @returns The gap length in mm
   */
  static calculateGapLength(thickness: number, angle: number): number {
    if (thickness <= 0) {
      throw new Error('Thickness must be positive');
    }

    if (angle < 0 || angle > 90) {
      throw new Error('Angle must be between 0 and 90 degrees');
    }

    // Special case: 90 degrees means no gap
    if (angle === 90) {
      return 0;
    }

    // Special case: 0 degrees means infinite gap
    if (angle === 0) {
      return Infinity;
    }

    // Convert angle to radians
    const angleInRadians = (angle * Math.PI) / 180;
    
    // Calculate gap using trigonometry: gap = thickness / tan(angle)
    const gap = thickness / Math.tan(angleInRadians);
    
    return gap;
  }

  /**
   * Calculate the saving from shared cutting between two angled parts
   * @param thickness - The thickness of the material in mm
   * @param angle1 - The angle of the first part in degrees
   * @param angle2 - The angle of the second part in degrees
   * @returns The total saving in mm
   */
  static calculateSharedCutSaving(thickness: number, angle1: number, angle2: number): number {
    // If either angle is 90 degrees, no saving is possible
    if (angle1 === 90 || angle2 === 90) {
      return 0;
    }

    const gap1 = this.calculateGapLength(thickness, angle1);
    const gap2 = this.calculateGapLength(thickness, angle2);

    // For perfect match (same angle), the saving is the sum of both gaps
    if (angle1 === angle2) {
      // Avoid Infinity * 2 for 0 degree angles
      if (gap1 === Infinity) {
        return thickness * 2; // Maximum possible saving
      }
      return gap1 + gap2;
    }

    // For different angles, the saving is limited by the smaller gap
    const minGap = Math.min(gap1, gap2);
    
    // If one gap is Infinity, limit saving to 2 * thickness
    if (minGap === Infinity) {
      return thickness * 2;
    }

    return minGap;
  }

  /**
   * Calculate total gap lengths for all angles of a part
   * @param thickness - The thickness of the material in mm
   * @param angles - The angles of all four corners
   * @returns The total gap length in mm
   */
  static calculateTotalGapsForPart(thickness: number, angles: PartAngles): number {
    const gaps = [
      this.calculateGapLength(thickness, angles.topLeft),
      this.calculateGapLength(thickness, angles.topRight),
      this.calculateGapLength(thickness, angles.bottomLeft),
      this.calculateGapLength(thickness, angles.bottomRight)
    ];

    // Filter out Infinity values and sum the rest
    const finiteGaps = gaps.filter(gap => gap !== Infinity);
    
    // If any gap is Infinity, return a large but finite value
    if (gaps.some(gap => gap === Infinity)) {
      // Return a practical maximum (e.g., 1000 times the thickness)
      return thickness * 1000 + finiteGaps.reduce((sum, gap) => sum + gap, 0);
    }

    return gaps.reduce((sum, gap) => sum + gap, 0);
  }
}