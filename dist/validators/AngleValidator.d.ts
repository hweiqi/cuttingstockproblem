import { PartAngles } from '../types';
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}
export interface AnglesValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class AngleValidator {
    private readonly MIN_ANGLE;
    private readonly MAX_ANGLE;
    private readonly NO_CUT_ANGLE;
    private readonly MIN_PRODUCTION_ANGLE;
    /**
     * 驗證單個角度值
     */
    validateSingleAngle(angle: number): ValidationResult;
    /**
     * 驗證零件的所有角度
     */
    validatePartAngles(angles: PartAngles | undefined | null): AnglesValidationResult;
    /**
     * 標準化角度值
     */
    normalizeAngles(angles: PartAngles | undefined): PartAngles;
    /**
     * 檢查角度組合是否適合生產
     */
    isValidForProduction(angles: PartAngles): boolean;
    /**
     * 生成有效的隨機角度組合
     */
    generateValidAngles(): PartAngles;
    /**
     * 標準化單個角度
     */
    private normalizeAngle;
    /**
     * 獲取位置的中文名稱
     */
    private getPositionName;
}
