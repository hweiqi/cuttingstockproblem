"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlexibleAngleMatcher = void 0;
class FlexibleAngleMatcher {
    constructor() {
        this.DEFAULT_TOLERANCE = 5; // degrees
        this.CUTTING_LOSS = 5; // mm
    }
    /**
     * Find all possible angle matches between two parts
     * This includes different positions and orientations
     */
    findAllPossibleMatches(part1, part2, tolerance = this.DEFAULT_TOLERANCE) {
        const matches = [];
        // Get all valid angles from both parts
        const part1Angles = this.extractValidAngles(part1);
        const part2Angles = this.extractValidAngles(part2);
        if (part1Angles.length === 0 || part2Angles.length === 0) {
            return matches;
        }
        // Try all combinations of angles
        for (const angle1 of part1Angles) {
            for (const angle2 of part2Angles) {
                // Check if angles are within tolerance
                const angleDiff = Math.abs(angle1.angle - angle2.angle);
                if (angleDiff <= tolerance) {
                    // Try different orientations
                    const orientations = this.getOrientationCombinations();
                    for (const [orient1, orient2] of orientations) {
                        const match = this.createMatch(part1, angle1, orient1, part2, angle2, orient2, angleDiff);
                        if (this.isValidMatch(match, angle1, angle2)) {
                            matches.push(match);
                        }
                    }
                }
            }
        }
        // Sort by savings (descending)
        return matches.sort((a, b) => b.savings - a.savings);
    }
    extractValidAngles(part) {
        const angles = [];
        // Check all four corners
        const positions = [
            { side: 'left', position: 'top', angle: part.angles.topLeft },
            { side: 'right', position: 'top', angle: part.angles.topRight },
            { side: 'left', position: 'bottom', angle: part.angles.bottomLeft },
            { side: 'right', position: 'bottom', angle: part.angles.bottomRight }
        ];
        for (const pos of positions) {
            // Only angles between 0° and 90° (exclusive) are valid
            if (pos.angle > 0 && pos.angle < 90) {
                angles.push(pos);
            }
        }
        return angles;
    }
    getOrientationCombinations() {
        const orientations = [
            { isFlipped: false },
            { isFlipped: true, flipDirection: 'horizontal' },
            { isFlipped: true, flipDirection: 'vertical' },
            { isFlipped: true, flipDirection: 'both' }
        ];
        const combinations = [];
        // Try all combinations
        for (const orient1 of orientations) {
            for (const orient2 of orientations) {
                combinations.push([orient1, orient2]);
            }
        }
        return combinations;
    }
    createMatch(part1, angle1, orient1, part2, angle2, orient2, angleDiff) {
        // Calculate average angle
        const avgAngle = (angle1.angle + angle2.angle) / 2;
        // Calculate savings
        const thickness = Math.max(part1.thickness || 20, part2.thickness || 20);
        const savings = this.calculateSavings(avgAngle, thickness);
        return {
            angle: avgAngle,
            part1Id: part1.id,
            part1Position: angle1,
            part1Orientation: orient1,
            part2Id: part2.id,
            part2Position: angle2,
            part2Orientation: orient2,
            angleDifference: angleDiff,
            savings
        };
    }
    calculateSavings(angle, thickness) {
        if (angle === 0 || angle === 90) {
            return 0;
        }
        // Convert to radians
        const angleRad = (angle * Math.PI) / 180;
        // Calculate gap savings
        const gap = thickness / Math.tan(angleRad);
        // Total savings = cutting loss + gap
        return Math.round((this.CUTTING_LOSS + gap) * 100) / 100;
    }
    isValidMatch(match, angle1, angle2) {
        // Avoid matching the same side without flip when parts would collide
        if (angle1.side === angle2.side &&
            !match.part1Orientation.isFlipped &&
            !match.part2Orientation.isFlipped) {
            return false;
        }
        // Ensure the match has positive savings
        return match.savings > 0;
    }
}
exports.FlexibleAngleMatcher = FlexibleAngleMatcher;
