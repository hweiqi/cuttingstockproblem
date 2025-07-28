import { SharedCutChain } from '../../core/v6/models/Chain';
import { PartInstance } from '../../core/v6/models/Part';
import { MaterialInstance, PlacedPart, PlacementConstraints } from '../../core/v6/models/Material';

export class ChainPlacer {
  constructor(private constraints: PlacementConstraints) {}

  placeChains(
    chains: SharedCutChain[],
    partInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (const chain of chains) {
      const chainInstances = this.collectChainInstances(chain, partInstances, usedInstances);
      
      if (chainInstances.length < 2) continue;
      
      const requiredLength = this.calculateChainLength(chainInstances, chain);
      const suitableMaterial = this.findSuitableMaterial(materialInstances, requiredLength);
      
      if (suitableMaterial) {
        this.placeChainOnMaterial(chain, chainInstances, suitableMaterial, placedParts, usedInstances);
      } else {
        this.placeSplitChain(chain, chainInstances, materialInstances, placedParts, usedInstances);
      }
    }
  }

  private collectChainInstances(
    chain: SharedCutChain,
    partInstances: PartInstance[],
    usedInstances: Set<string>
  ): PartInstance[] {
    const chainInstances: PartInstance[] = [];
    
    for (const chainPart of chain.parts) {
      const instance = partInstances.find(inst => 
        inst.part.id === chainPart.partId &&
        inst.instanceId === chainPart.instanceId &&
        !usedInstances.has(this.getInstanceKey(inst))
      );
      
      if (instance) {
        chainInstances.push(instance);
      }
    }
    
    return chainInstances;
  }

  private calculateChainLength(instances: PartInstance[], chain: SharedCutChain): number {
    let totalLength = this.constraints.frontEndLoss + this.constraints.backEndLoss;
    
    for (let i = 0; i < instances.length; i++) {
      totalLength += instances[i].part.length;
      
      if (i < instances.length - 1 && i < chain.connections.length) {
        totalLength -= chain.connections[i].savings;
      } else if (i < instances.length - 1) {
        totalLength += this.constraints.cuttingLoss;
      }
    }
    
    return totalLength;
  }

  private findSuitableMaterial(
    materialInstances: MaterialInstance[],
    requiredLength: number
  ): MaterialInstance | null {
    let availableMaterials = materialInstances.filter(mat => {
      const remainingLength = mat.material.length - mat.usedLength;
      return remainingLength >= requiredLength;
    });
    
    if (availableMaterials.length > 0) {
      return availableMaterials.reduce((best, current) => {
        const bestRemaining = best.material.length - best.usedLength - requiredLength;
        const currentRemaining = current.material.length - current.usedLength - requiredLength;
        return Math.abs(currentRemaining) < Math.abs(bestRemaining) ? current : best;
      });
    }
    
    const minRequiredLength = requiredLength - this.constraints.frontEndLoss - this.constraints.backEndLoss + 20;
    availableMaterials = materialInstances.filter(mat => {
      const remainingLength = mat.material.length - mat.usedLength;
      return remainingLength >= minRequiredLength;
    });
    
    if (availableMaterials.length > 0) {
      return availableMaterials.reduce((best, current) => {
        const bestRemaining = best.material.length - best.usedLength - minRequiredLength;
        const currentRemaining = current.material.length - current.usedLength - minRequiredLength;
        return Math.abs(currentRemaining) < Math.abs(bestRemaining) ? current : best;
      });
    }
    
    return null;
  }

  private placeChainOnMaterial(
    chain: SharedCutChain,
    chainInstances: PartInstance[],
    material: MaterialInstance,
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    let position = material.usedLength + this.constraints.frontEndLoss;
    
    for (let i = 0; i < chainInstances.length; i++) {
      const instance = chainInstances[i];
      const connection = i > 0 ? chain.connections[i - 1] : null;
      
      const placed: PlacedPart = {
        partId: instance.part.id,
        partInstanceId: instance.instanceId,
        materialId: material.material.id,
        materialInstanceId: material.instanceId,
        position,
        length: instance.part.length,
        orientation: 'normal'
      };
      
      if (connection) {
        placed.sharedCuttingInfo = {
          pairedWithPartId: chainInstances[i - 1].part.id,
          pairedWithInstanceId: chainInstances[i - 1].instanceId,
          sharedAngle: connection.sharedAngle,
          savings: connection.savings
        };
        
        const prevPlaced = placedParts[placedParts.length - 1];
        prevPlaced.sharedCuttingInfo = {
          pairedWithPartId: instance.part.id,
          pairedWithInstanceId: instance.instanceId,
          sharedAngle: connection.sharedAngle,
          savings: connection.savings
        };
        
        (placed as any).isSharedCut = true;
        (placed as any).sharedWith = chainInstances[i - 1].part.id;
        (placed as any).angleSavings = connection.savings;
        
        (prevPlaced as any).isSharedCut = true;
        (prevPlaced as any).sharedWith = instance.part.id;
        (prevPlaced as any).angleSavings = connection.savings;
      }
      
      placedParts.push(placed);
      usedInstances.add(this.getInstanceKey(instance));
      
      if (connection) {
        position += instance.part.length - connection.savings;
      } else {
        position += instance.part.length + this.constraints.cuttingLoss;
      }
    }
    
    material.usedLength = position - this.constraints.cuttingLoss + this.constraints.backEndLoss;
  }

  private placeSplitChain(
    chain: SharedCutChain,
    chainInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (let groupSize = chainInstances.length; groupSize >= 2; groupSize--) {
      for (let startIdx = 0; startIdx <= chainInstances.length - groupSize; startIdx++) {
        const group = chainInstances.slice(startIdx, startIdx + groupSize);
        const connections = chain.connections.slice(startIdx, startIdx + groupSize - 1);
        
        if (group.some(inst => usedInstances.has(this.getInstanceKey(inst)))) {
          continue;
        }
        
        const subChain: SharedCutChain = {
          ...chain,
          parts: group.map((inst, idx) => ({
            partId: inst.part.id,
            instanceId: inst.instanceId,
            position: idx
          })),
          connections: connections,
          totalSavings: connections.reduce((sum, conn) => sum + conn.savings, 0)
        };
        
        const requiredLength = this.calculateChainLength(group, subChain);
        const suitableMaterial = this.findSuitableMaterial(materialInstances, requiredLength);
        
        if (suitableMaterial) {
          this.placeChainOnMaterial(subChain, group, suitableMaterial, placedParts, usedInstances);
          startIdx = Math.max(0, startIdx - 1);
        }
      }
    }
  }

  private getInstanceKey(instance: PartInstance): string {
    return `${instance.part.id}_${instance.instanceId}`;
  }
}