import { PartInstance } from '../../core/v6/models/Part';
import { MaterialInstance } from '../../core/v6/models/Material';

export interface PackingItem {
  instance: PartInstance;
  requiredLength: number;
  actualLength: number;
}

export interface MaterialBin {
  material: MaterialInstance;
  items: PackingItem[];
  usedLength: number;
  remainingLength: number;
}

export interface PackingResult {
  bins: MaterialBin[];
  unplaced: PackingItem[];
}

export interface IPackingStrategy {
  pack(items: PackingItem[], bins: MaterialBin[]): PackingResult;
}