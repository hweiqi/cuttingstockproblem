import { Material } from '../types';
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}
export interface MaterialListValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface DuplicateLengthInfo {
    length: number;
    materialIds: string[];
}
export declare class MaterialValidator {
    private readonly MIN_LENGTH;
    private readonly MAX_LENGTH;
    private readonly STANDARD_LENGTHS;
    /**
     * 驗證單個材料
     */
    validateSingleMaterial(material: Material): ValidationResult;
    /**
     * 驗證材料列表
     */
    validateMaterialList(materials: Material[]): MaterialListValidationResult;
    /**
     * 檢查重複長度
     */
    checkDuplicateLengths(materials: Material[]): DuplicateLengthInfo[];
    /**
     * 檢查是否為生產可用的標準長度
     */
    isValidForProduction(material: Material): boolean;
    /**
     * 生成不重複的材料長度
     */
    generateUniqueLengths(count: number): number[];
    /**
     * 驗證材料是否可以被添加到現有列表
     */
    canAddToList(newMaterial: Material, existingMaterials: Material[]): ValidationResult;
    /**
     * 獲取建議的材料長度（不與現有材料重複）
     */
    getSuggestedLengths(existingMaterials: Material[], count?: number): number[];
}
