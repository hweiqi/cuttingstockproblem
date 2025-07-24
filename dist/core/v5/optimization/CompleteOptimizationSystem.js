"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteOptimizationSystem = void 0;
const CompletePlacementGuarantor_1 = require("../placement/CompletePlacementGuarantor");
const FlexibleAngleMatcher_1 = require("../../v4/matchers/FlexibleAngleMatcher");
const ImprovedChainBuilder_1 = require("./ImprovedChainBuilder");
class CompleteOptimizationSystem {
    constructor() {
        this.placementGuarantor = new CompletePlacementGuarantor_1.CompletePlacementGuarantor();
        this.angleMatcher = new FlexibleAngleMatcher_1.FlexibleAngleMatcher();
        this.chainBuilder = new ImprovedChainBuilder_1.ImprovedChainBuilder();
    }
    optimize(parts, materials) {
        const startTime = performance.now();
        const warnings = [];
        const optimizationSteps = [];
        // Step 1: Analyze input
        optimizationSteps.push('Analyzing input parts and materials');
        const inputAnalysis = this.analyzeInput(parts, materials);
        // Step 2: Build shared cutting chains
        optimizationSteps.push('Building shared cutting chains');
        const chainStartTime = performance.now();
        const chains = this.chainBuilder.buildChains(parts);
        const sharedCuttingTime = performance.now() - chainStartTime;
        // Step 3: Determine optimization strategy
        const strategy = this.determineStrategy(parts, materials, chains);
        optimizationSteps.push(`Using strategy: ${strategy}`);
        // Step 4: Perform placement with shared cutting integration
        optimizationSteps.push('Executing placement with guarantees');
        const placementStartTime = performance.now();
        const sharedCuttingInfo = chains.map(chain => {
            // 提取鏈中的零件ID（保持順序）
            const partIds = [];
            for (const part of chain.parts) {
                partIds.push(part.partId);
            }
            return {
                parts: partIds,
                savings: chain.totalSavings
            };
        });
        const placementResult = this.placementGuarantor.guaranteeAllPlacements(parts, materials, undefined, sharedCuttingInfo);
        const placementTime = performance.now() - placementStartTime;
        // Step 5: Check for virtual material usage
        if (placementResult.virtualMaterialsCreated > 0) {
            warnings.push(`Virtual materials were created: ${placementResult.virtualMaterialsCreated} materials`);
            optimizationSteps.push('Created virtual materials to ensure all parts are placed');
        }
        // Step 6: Generate suggestions
        const suggestions = this.generateSuggestions(parts, materials, placementResult, chains);
        // Step 7: Create visualization data
        const visualization = this.createVisualization(placementResult);
        // Step 8: Calculate final metrics
        const executionTime = performance.now() - startTime;
        const sharedCutting = {
            chains,
            totalChains: chains.length,
            totalSavings: chains.reduce((sum, chain) => sum + chain.totalSavings, 0)
        };
        const summary = {
            allPartsPlaced: placementResult.unplacedParts.length === 0,
            optimizationLevel: this.determineOptimizationLevel(chains, placementResult),
            strategy
        };
        const report = this.createReport(inputAnalysis, optimizationSteps, placementResult, sharedCutting, { totalTime: executionTime, sharedCuttingTime, placementTime });
        return {
            placement: placementResult,
            sharedCutting,
            summary,
            warnings,
            suggestions,
            executionTime,
            report,
            visualization
        };
    }
    analyzeInput(parts, materials) {
        const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);
        const totalMaterials = materials.reduce((sum, m) => sum + m.quantity, 0);
        const uniqueAngles = new Set();
        parts.forEach(part => {
            if (part.angles) {
                Object.values(part.angles).forEach(angle => {
                    if (angle > 0 && angle < 90) {
                        uniqueAngles.add(angle);
                    }
                });
            }
        });
        return {
            totalParts,
            totalMaterials,
            uniqueAngles: Array.from(uniqueAngles).sort((a, b) => a - b)
        };
    }
    determineStrategy(parts, materials, chains) {
        // Check part uniformity
        const lengths = new Set(parts.map(p => p.length));
        const quantities = new Set(parts.map(p => p.quantity));
        const isUniform = lengths.size === 1 && quantities.size === 1;
        // Check size distribution
        const partLengths = parts.map(p => p.length);
        const avgLength = partLengths.reduce((a, b) => a + b, 0) / partLengths.length;
        const variance = partLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / partLengths.length;
        const isMixedSizes = variance > avgLength * avgLength * 0.1;
        // Check material sufficiency
        const totalPartLength = parts.reduce((sum, p) => sum + p.length * p.quantity, 0);
        const totalMaterialLength = materials.reduce((sum, m) => sum + m.length * m.quantity, 0);
        const isSufficient = totalMaterialLength >= totalPartLength * 1.2;
        // Check shared cutting potential
        const hasGoodSharing = chains.length > 0 &&
            chains.reduce((sum, c) => sum + c.totalSavings, 0) > totalPartLength * 0.05;
        if (isUniform && hasGoodSharing) {
            return 'Uniform parts with shared cutting optimization';
        }
        else if (isUniform && !hasGoodSharing) {
            return 'Uniform parts standard packing';
        }
        else if (!isSufficient) {
            return 'Material conservation with virtual material fallback';
        }
        else if (isMixedSizes && hasGoodSharing) {
            return 'Mixed size optimization with shared cutting';
        }
        else if (hasGoodSharing) {
            return 'Mixed optimization with shared cutting priority';
        }
        else {
            return 'Standard bin packing optimization';
        }
    }
    determineOptimizationLevel(chains, placementResult) {
        if (chains.length === 0) {
            return 'none';
        }
        const sharedParts = placementResult.placedParts.filter(p => p.sharedCuttingPair).length;
        const totalParts = placementResult.placedParts.length;
        if (sharedParts / totalParts > 0.5) {
            return 'advanced';
        }
        else if (sharedParts > 0) {
            return 'basic';
        }
        return 'none';
    }
    generateSuggestions(parts, materials, placementResult, chains) {
        const suggestions = [];
        // Check for parts with no angles
        const partsWithoutAngles = parts.filter(p => Object.values(p.angles).every(a => a === 0 || a === 90));
        if (partsWithoutAngles.length > 0) {
            suggestions.push({
                type: 'angle_modification',
                description: `${partsWithoutAngles.length} parts have only 0° or 90° angles. Adding angled cuts could enable shared cutting.`,
                potentialImprovement: 'Up to 15% material savings through shared cutting'
            });
        }
        // Check for virtual material usage
        if (placementResult.virtualMaterialsCreated > 0) {
            const additionalMaterialNeeded = placementResult.usedMaterials
                .filter(m => m.isVirtual)
                .reduce((sum, m) => sum + m.length, 0);
            suggestions.push({
                type: 'material_recommendation',
                description: `Add ${placementResult.virtualMaterialsCreated} more materials to avoid virtual materials`,
                potentialImprovement: `${additionalMaterialNeeded}mm of additional material needed`
            });
        }
        // Check for poor utilization
        if (placementResult.materialUtilization < 0.7) {
            suggestions.push({
                type: 'quantity_adjustment',
                description: 'Consider batching similar parts together for better material utilization',
                potentialImprovement: 'Could improve utilization from ' +
                    `${(placementResult.materialUtilization * 100).toFixed(1)}% to over 70%`
            });
        }
        return suggestions;
    }
    createVisualization(placementResult) {
        const materials = [];
        // Group parts by material
        const partsByMaterial = new Map();
        for (const part of placementResult.placedParts) {
            if (!partsByMaterial.has(part.materialId)) {
                partsByMaterial.set(part.materialId, []);
            }
            partsByMaterial.get(part.materialId).push(part);
        }
        // Create visualization for each material
        for (const material of placementResult.usedMaterials) {
            const parts = partsByMaterial.get(material.id) || [];
            const sortedParts = parts.sort((a, b) => a.position - b.position);
            const totalUsedLength = parts.length > 0
                ? Math.max(...parts.map(p => p.position + p.length))
                : 0;
            materials.push({
                id: material.id,
                length: material.length,
                parts: sortedParts.map(p => ({
                    id: p.partId,
                    position: p.position,
                    length: p.length,
                    isSharedCut: !!p.sharedCuttingPair
                })),
                utilization: totalUsedLength / material.length
            });
        }
        return { materials };
    }
    createReport(inputAnalysis, optimizationSteps, placementResult, sharedCutting, performanceMetrics) {
        const placementEfficiency = placementResult.materialUtilization;
        const sharedCuttingEfficiency = sharedCutting.totalChains > 0
            ? sharedCutting.totalSavings / (placementResult.placedParts.length * 10) // Normalized
            : 0;
        const overallScore = (placementEfficiency * 0.7 + sharedCuttingEfficiency * 0.3);
        const recommendations = [];
        if (placementEfficiency < 0.8) {
            recommendations.push('Consider ordering parts by size for better packing');
        }
        if (sharedCuttingEfficiency < 0.5 && inputAnalysis.uniqueAngles.length > 0) {
            recommendations.push('Review part angles for better shared cutting opportunities');
        }
        if (placementResult.virtualMaterialsCreated > 0) {
            recommendations.push('Order additional materials to avoid virtual material usage');
        }
        return {
            inputSummary: inputAnalysis,
            optimizationSteps,
            finalResults: {
                placementEfficiency,
                sharedCuttingEfficiency,
                overallScore
            },
            recommendations,
            performanceMetrics
        };
    }
}
exports.CompleteOptimizationSystem = CompleteOptimizationSystem;
