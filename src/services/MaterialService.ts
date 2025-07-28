import { Material } from '../types';
import { MaterialValidator } from '../validators/MaterialValidator';

export class MaterialService {
  private materials: Map<string, Material> = new Map();
  private idCounter = 0;
  private validator: MaterialValidator;

  constructor() {
    this.validator = new MaterialValidator();
  }

  addMaterial(length: number): Material {
    const id = this.generateId();
    // 預設為無限供應（quantity: 0）
    const material: Material = { id, length, quantity: 0 };
    
    // 驗證是否可以添加到現有列表（包括重複長度檢查）
    const validationResult = this.validator.canAddToList(material, this.getAllMaterials());
    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }
    
    this.materials.set(id, material);
    return material;
  }

  addMaterialWithQuantity(length: number, quantity: number): Material {
    if (quantity < 0) {
      throw new Error('材料數量不能為負數');
    }
    
    const id = this.generateId();
    const material: Material = { id, length, quantity };
    
    // 驗證是否可以添加到現有列表（包括重複長度檢查）
    const validationResult = this.validator.canAddToList(material, this.getAllMaterials());
    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }
    
    this.materials.set(id, material);
    return material;
  }

  removeMaterial(id: string): boolean {
    return this.materials.delete(id);
  }

  getMaterial(id: string): Material | undefined {
    return this.materials.get(id);
  }

  getAllMaterials(): Material[] {
    return Array.from(this.materials.values());
  }

  updateMaterial(id: string, newLength: number): Material | undefined {
    const material = this.materials.get(id);
    if (!material) {
      return undefined;
    }

    // 如果長度沒變，直接返回
    if (material.length === newLength) {
      return material;
    }

    // 創建臨時材料進行驗證
    const tempMaterial: Material = { ...material, length: newLength };
    
    // 獲取其他材料（排除當前材料）
    const otherMaterials = this.getAllMaterials().filter(m => m.id !== id);
    
    // 驗證是否可以添加到現有列表（包括重複長度檢查）
    const validationResult = this.validator.canAddToList(tempMaterial, otherMaterials);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }
    
    material.length = newLength;
    return material;
  }

  updateMaterialQuantity(id: string, newQuantity: number): Material | undefined {
    if (newQuantity < 0) {
      throw new Error('材料數量不能為負數');
    }

    const material = this.materials.get(id);
    if (!material) {
      return undefined;
    }

    material.quantity = newQuantity;
    return material;
  }

  clearAllMaterials(): void {
    this.materials.clear();
    this.idCounter = 0; // Reset ID counter
  }

  getMaterialsByLength(ascending: boolean = true): Material[] {
    const materials = this.getAllMaterials();
    return materials.sort((a, b) => {
      return ascending ? a.length - b.length : b.length - a.length;
    });
  }

  private generateId(): string {
    return `material-${++this.idCounter}-${Date.now()}`;
  }
}