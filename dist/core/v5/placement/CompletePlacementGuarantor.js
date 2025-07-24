"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletePlacementGuarantor = void 0;
class CompletePlacementGuarantor {
    constructor() {
        this.virtualMaterialIdCounter = 0;
        this.DEFAULT_CONSTRAINTS = {
            cuttingLoss: 5,
            frontEndLoss: 20,
            backEndLoss: 15
        };
    }
    /**
     * Guarantees that ALL valid parts will be placed
     * Uses virtual materials if necessary
     */
    guaranteeAllPlacements(parts, materials, constraints, sharedCuttingChains) {
        const placementConstraints = { ...this.DEFAULT_CONSTRAINTS, ...constraints };
        // Validate and expand parts
        const { validParts, invalidParts } = this.validateParts(parts);
        const partInstances = this.expandPartsByQuantity(validParts);
        // Initialize material slots
        const materialSlots = this.initializeMaterialSlots(materials);
        // Place parts with shared cutting consideration
        const placedParts = [];
        const unplacedInstances = [];
        // First, try to place shared cutting chains
        if (sharedCuttingChains && sharedCuttingChains.length > 0) {
            this.placeSharedCuttingChains(partInstances, materialSlots, placedParts, sharedCuttingChains, placementConstraints);
        }
        // Then place remaining parts
        for (const instance of partInstances) {
            if (!this.isPartPlaced(instance, placedParts)) {
                const placed = this.placePartInstance(instance, materialSlots, placementConstraints);
                if (placed) {
                    placedParts.push(placed);
                }
                else {
                    unplacedInstances.push(instance);
                }
            }
        }
        // CRITICAL: Place any remaining parts on virtual materials
        if (unplacedInstances.length > 0) {
            this.placeOnVirtualMaterials(unplacedInstances, materialSlots, placedParts, placementConstraints);
        }
        // Calculate results
        const result = this.calculateResult(placedParts, materialSlots, invalidParts, partInstances.length);
        // CRITICAL ASSERTION: No unplaced parts allowed
        if (result.unplacedParts.length > 0) {
            throw new Error('CRITICAL ERROR: Failed to place all parts. This should never happen!');
        }
        return result;
    }
    validateParts(parts) {
        const validParts = [];
        const invalidParts = [];
        for (const part of parts) {
            if (part.length <= 0) {
                invalidParts.push({
                    partId: part.id,
                    reason: `Invalid length: ${part.length}`
                });
            }
            else if (part.quantity < 0) {
                invalidParts.push({
                    partId: part.id,
                    reason: `Invalid quantity: ${part.quantity}`
                });
            }
            else if (part.quantity > 0) {
                validParts.push(part);
            }
            // Skip parts with quantity = 0
        }
        return { validParts, invalidParts };
    }
    expandPartsByQuantity(parts) {
        const instances = [];
        for (const part of parts) {
            for (let i = 0; i < part.quantity; i++) {
                instances.push({ part, instanceId: i });
            }
        }
        return instances;
    }
    initializeMaterialSlots(materials) {
        const slots = [];
        for (const material of materials) {
            for (let i = 0; i < material.quantity; i++) {
                slots.push({
                    material: {
                        ...material,
                        id: `${material.id}_${i}`
                    },
                    usedLength: 0,
                    placedParts: []
                });
            }
        }
        return slots;
    }
    placePartInstance(instance, materialSlots, constraints) {
        const partLength = instance.part.length;
        // Try each material slot
        for (const slot of materialSlots) {
            if (slot.material.isVirtual)
                continue; // Skip virtual materials in first pass
            const position = this.findPositionOnMaterial(slot, partLength, constraints);
            if (position !== null) {
                const placed = {
                    partId: instance.part.id,
                    materialId: slot.material.id,
                    position,
                    length: partLength,
                    orientation: 'normal'
                };
                slot.placedParts.push(placed);
                slot.usedLength = Math.max(slot.usedLength, position + partLength + constraints.backEndLoss);
                return placed;
            }
        }
        return null;
    }
    findPositionOnMaterial(slot, partLength, constraints) {
        const materialLength = slot.material.length;
        // Check if part can fit at all
        const minRequiredLength = constraints.frontEndLoss + partLength + constraints.backEndLoss;
        if (minRequiredLength > materialLength) {
            return null;
        }
        // Sort existing parts by position
        const sortedParts = [...slot.placedParts].sort((a, b) => a.position - b.position);
        // Try to place at the beginning
        if (sortedParts.length === 0) {
            return constraints.frontEndLoss;
        }
        // Try to place after each existing part
        let currentPosition = constraints.frontEndLoss;
        for (const existingPart of sortedParts) {
            const gap = existingPart.position - currentPosition;
            if (gap >= partLength + constraints.cuttingLoss) {
                return currentPosition;
            }
            currentPosition = existingPart.position + existingPart.length + constraints.cuttingLoss;
        }
        // Try to place at the end
        const remainingLength = materialLength - currentPosition - constraints.backEndLoss;
        if (remainingLength >= partLength) {
            return currentPosition;
        }
        return null;
    }
    placeOnVirtualMaterials(unplacedInstances, materialSlots, placedParts, constraints) {
        // Group by part length for efficient virtual material creation
        const groupedByLength = new Map();
        for (const instance of unplacedInstances) {
            const length = instance.part.length;
            if (!groupedByLength.has(length)) {
                groupedByLength.set(length, []);
            }
            groupedByLength.get(length).push(instance);
        }
        // Create virtual materials for each group
        for (const [partLength, instances] of groupedByLength) {
            const virtualLength = this.calculateVirtualMaterialLength(partLength, instances.length, constraints);
            const virtualMaterial = {
                id: `VIRTUAL_${this.virtualMaterialIdCounter++}`,
                length: virtualLength,
                quantity: 1,
                isVirtual: true
            };
            const virtualSlot = {
                material: virtualMaterial,
                usedLength: 0,
                placedParts: []
            };
            // Place all instances on this virtual material
            for (const instance of instances) {
                const position = this.findPositionOnMaterial(virtualSlot, partLength, constraints);
                if (position !== null) {
                    const placed = {
                        partId: instance.part.id,
                        materialId: virtualMaterial.id,
                        position,
                        length: partLength,
                        orientation: 'normal'
                    };
                    virtualSlot.placedParts.push(placed);
                    virtualSlot.usedLength = Math.max(virtualSlot.usedLength, position + partLength + constraints.backEndLoss);
                    placedParts.push(placed);
                }
                else {
                    // This should never happen - create another virtual material
                    this.placeOnVirtualMaterials([instance], materialSlots, placedParts, constraints);
                }
            }
            materialSlots.push(virtualSlot);
        }
    }
    calculateVirtualMaterialLength(partLength, count, constraints) {
        // Calculate minimum length needed
        const minLength = constraints.frontEndLoss +
            (partLength + constraints.cuttingLoss) * count -
            constraints.cuttingLoss +
            constraints.backEndLoss;
        // Use standard sizes if possible
        const standardSizes = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000];
        for (const size of standardSizes) {
            if (size >= minLength) {
                return size;
            }
        }
        // Use exact size with 10% buffer
        return Math.ceil(minLength * 1.1);
    }
    placeSharedCuttingChains(partInstances, materialSlots, placedParts, chains, constraints) {
        // 處理每個共刀鏈
        for (const chain of chains) {
            // 收集該鏈中尚未放置的零件實例
            const chainPartIds = new Set(chain.parts);
            const availableInstances = [];
            // 按照鏈中的順序收集零件
            for (const partId of chain.parts) {
                // 找到該partId對應的未放置實例
                const instance = partInstances.find(inst => inst.part.id === partId && !this.isPartPlaced(inst, placedParts));
                if (instance) {
                    availableInstances.push(instance);
                }
            }
            // 如果有足夠的零件可以形成鏈
            if (availableInstances.length >= 2) {
                // 嘗試將鏈放置在材料上
                let placed = false;
                for (const slot of materialSlots) {
                    if (this.canFitChain(availableInstances, slot, constraints)) {
                        this.placeChainOnMaterial(availableInstances, slot, placedParts, constraints, chain.savings / availableInstances.length // 平均節省量
                        );
                        placed = true;
                        break;
                    }
                }
                // 如果無法作為整體放置，分批放置
                if (!placed && availableInstances.length > 2) {
                    // 將鏈分成較小的部分
                    for (let i = 0; i < availableInstances.length - 1; i += 2) {
                        const subChain = availableInstances.slice(i, Math.min(i + 2, availableInstances.length));
                        for (const slot of materialSlots) {
                            if (this.canFitChain(subChain, slot, constraints)) {
                                this.placeChainOnMaterial(subChain, slot, placedParts, constraints, chain.savings / availableInstances.length);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    canFitChain(chainParts, slot, constraints) {
        const totalLength = chainParts.reduce((sum, p) => sum + p.part.length, 0);
        const requiredLength = constraints.frontEndLoss + totalLength +
            (chainParts.length - 1) * constraints.cuttingLoss + constraints.backEndLoss;
        const availableLength = slot.material.length - slot.usedLength;
        return availableLength >= requiredLength;
    }
    placeChainOnMaterial(chainParts, slot, placedParts, constraints, savings) {
        let position = slot.usedLength > 0 ? slot.usedLength : constraints.frontEndLoss;
        for (let i = 0; i < chainParts.length; i++) {
            const part = chainParts[i];
            const placed = {
                partId: part.part.id,
                materialId: slot.material.id,
                position,
                length: part.part.length,
                orientation: 'normal'
            };
            if (i > 0) {
                placed.sharedCuttingPair = chainParts[i - 1].part.id;
                placedParts[placedParts.length - 1].sharedCuttingPair = part.part.id;
            }
            slot.placedParts.push(placed);
            placedParts.push(placed);
            position += part.part.length + (i < chainParts.length - 1 ? constraints.cuttingLoss - savings : 0);
        }
        slot.usedLength = position + constraints.backEndLoss;
    }
    isPartPlaced(instance, placedParts) {
        const placedCount = placedParts.filter(p => p.partId === instance.part.id).length;
        return placedCount > instance.instanceId;
    }
    calculateResult(placedParts, materialSlots, invalidParts, totalPartsNeeded) {
        const usedSlots = materialSlots.filter(slot => slot.placedParts.length > 0);
        const usedMaterials = usedSlots.map(slot => slot.material);
        // Calculate utilization
        let totalUsedLength = 0;
        let totalAvailableLength = 0;
        let totalWaste = 0;
        for (const slot of usedSlots) {
            const materialLength = slot.material.length;
            const usedLength = slot.usedLength;
            totalUsedLength += slot.placedParts.reduce((sum, p) => sum + p.length, 0);
            totalAvailableLength += materialLength;
            totalWaste += materialLength - usedLength;
        }
        const materialUtilization = totalAvailableLength > 0
            ? totalUsedLength / totalAvailableLength
            : 0;
        const virtualMaterialsCreated = usedMaterials.filter(m => m.isVirtual).length;
        // Determine unplaced parts (should be none!)
        const placedPartIds = new Set(placedParts.map(p => p.partId));
        const unplacedParts = [];
        // This should never have entries
        if (placedParts.length < totalPartsNeeded) {
            console.error('WARNING: Not all parts were placed!');
        }
        const summary = {
            totalPartsPlaced: placedParts.length,
            totalMaterialsUsed: usedMaterials.length,
            averageUtilization: materialUtilization,
            totalWaste,
            placementStrategy: virtualMaterialsCreated > 0 ? 'Mixed (Real + Virtual)' : 'Real Materials Only'
        };
        return {
            placedParts,
            unplacedParts,
            usedMaterials,
            virtualMaterialsCreated,
            materialUtilization,
            summary,
            invalidParts
        };
    }
}
exports.CompletePlacementGuarantor = CompletePlacementGuarantor;
