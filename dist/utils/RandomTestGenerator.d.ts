import { Material, Part } from '../types';
export interface TestScenario {
    materials: Material[];
    parts: Part[];
}
export interface TestScenarioConfig {
    materialCount?: {
        min: number;
        max: number;
    };
    partCount?: {
        min: number;
        max: number;
    };
    materialLength?: {
        min: number;
        max: number;
    };
    partLength?: {
        min: number;
        max: number;
    };
}
export interface PresetScenario {
    name: string;
    description: string;
    scenario: TestScenario;
}
export declare class RandomTestGenerator {
    private seed;
    private angleValidator;
    private materialValidator;
    constructor();
    /**
     * 生成隨機材料
     */
    generateRandomMaterials(count: number, lengthRange?: {
        min: number;
        max: number;
    }): Material[];
    /**
     * 生成隨機零件
     */
    generateRandomParts(count: number): Part[];
    /**
     * 生成隨機角度
     */
    private generateRandomAngles;
    /**
     * 生成測試場景
     */
    generateTestScenario(config?: TestScenarioConfig): TestScenario;
    /**
     * 生成預設測試場景
     */
    generatePresetScenarios(): PresetScenario[];
    /**
     * 合併配置
     */
    private mergeConfig;
    /**
     * 簡單的隨機數生成器
     */
    private random;
}
