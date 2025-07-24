import { Material, Part, PartAngles } from '../types';
import { AngleValidator } from '../validators/AngleValidator';
import { MaterialValidator } from '../validators/MaterialValidator';
import { STANDARD_MATERIAL_LENGTHS } from '../config/MaterialConfig';

export interface TestScenario {
  materials: Material[];
  parts: Part[];
}

export interface TestScenarioConfig {
  materialCount?: { min: number; max: number };
  partCount?: { min: number; max: number };
  materialLength?: { min: number; max: number };
  partLength?: { min: number; max: number };
}

export interface PresetScenario {
  name: string;
  description: string;
  scenario: TestScenario;
}

export class RandomTestGenerator {
  private seed: number;
  private angleValidator: AngleValidator;
  private materialValidator: MaterialValidator;

  constructor() {
    // 使用時間戳確保每次都不同
    this.seed = Date.now();
    this.angleValidator = new AngleValidator();
    this.materialValidator = new MaterialValidator();
  }

  /**
   * 生成隨機材料（確保不重複長度）
   */
  generateRandomMaterials(count: number, lengthRange?: { min: number; max: number }): Material[] {
    if (count <= 0) return [];

    const materials: Material[] = [];
    const availableLengths = [...STANDARD_MATERIAL_LENGTHS];
    const usedLengths = new Set<number>();
    
    if (lengthRange) {
      // 如果有自定義範圍，過濾標準長度
      const filteredLengths = availableLengths.filter(
        length => length >= lengthRange.min && length <= lengthRange.max
      );
      
      // 如果過濾後沒有符合的標準長度，使用所有標準長度
      const lengthsToUse = filteredLengths.length > 0 ? filteredLengths : availableLengths;
      
      // 限制數量不超過可用長度數
      const actualCount = Math.min(count, lengthsToUse.length);
      
      for (let i = 0; i < actualCount; i++) {
        // 從可用的標準長度中隨機選擇一個未使用的
        const availableForSelection = lengthsToUse.filter(len => !usedLengths.has(len));
        if (availableForSelection.length === 0) break;
        
        const randomIndex = this.random(0, availableForSelection.length - 1);
        const length = availableForSelection[randomIndex];
        usedLengths.add(length);
        
        materials.push({
          id: `M${i + 1}-${Date.now()}-${i}`,
          length: length
        });
      }
    } else {
      // 使用所有標準長度，確保不重複
      const actualCount = Math.min(count, availableLengths.length);
      
      for (let i = 0; i < actualCount; i++) {
        // 從可用的標準長度中隨機選擇一個未使用的
        const availableForSelection = availableLengths.filter(len => !usedLengths.has(len));
        if (availableForSelection.length === 0) break;
        
        const randomIndex = this.random(0, availableForSelection.length - 1);
        const length = availableForSelection[randomIndex];
        usedLengths.add(length);
        
        materials.push({
          id: `M${i + 1}-${Date.now()}-${i}`,
          length: length
        });
      }
    }
    
    return materials;
  }

  /**
   * 生成隨機零件
   */
  generateRandomParts(count: number): Part[] {
    if (count <= 0) return [];

    const parts: Part[] = [];
    
    for (let i = 0; i < count; i++) {
      const hasAngles = this.random(0, 100) < 40; // 40% 機率有角度
      const length = Math.round(this.random(50, 500)) * 10; // 500-5000, 10的倍數
      
      const part: Part = {
        id: `P${i + 1}-${Date.now()}-${i}`,
        length: length,
        quantity: this.random(1, 10)
      };

      if (hasAngles) {
        part.angles = this.generateRandomAngles();
      }

      parts.push(part);
    }

    return parts;
  }

  /**
   * 生成隨機角度
   */
  private generateRandomAngles(): PartAngles {
    // 使用AngleValidator生成有效的角度組合
    return this.angleValidator.generateValidAngles();
  }

  /**
   * 生成測試場景
   */
  generateTestScenario(config?: TestScenarioConfig): TestScenario {
    const defaultConfig: Required<TestScenarioConfig> = {
      materialCount: { min: 3, max: 8 },
      partCount: { min: 5, max: 15 },
      materialLength: { min: 3000, max: 12000 },
      partLength: { min: 500, max: 5000 }
    };

    const mergedConfig = this.mergeConfig(defaultConfig, config);
    
    // 生成材料和零件數量
    const materialCount = this.random(
      mergedConfig.materialCount.min,
      mergedConfig.materialCount.max
    );
    const partCount = this.random(
      mergedConfig.partCount.min,
      mergedConfig.partCount.max
    );

    // 生成材料（使用配置的長度範圍）
    const materials = this.generateRandomMaterials(materialCount, mergedConfig.materialLength);

    // 生成零件，確保長度合理
    const parts = this.generateRandomParts(partCount);
    
    // 調整零件長度以符合材料範圍和配置
    const maxMaterialLength = Math.max(...materials.map(m => m.length));
    parts.forEach(part => {
      // 確保零件長度在配置範圍內
      if (part.length < mergedConfig.partLength.min) {
        part.length = mergedConfig.partLength.min;
      }
      if (part.length > mergedConfig.partLength.max) {
        part.length = mergedConfig.partLength.max;
      }
      // 確保零件長度不超過最大材料長度
      if (part.length > maxMaterialLength) {
        part.length = Math.floor(maxMaterialLength * 0.8 / 10) * 10;
      }
    });

    // 如果不是自定義配置，才進行平衡調整
    if (!config) {
      // 平衡材料和零件總長度
      const totalPartLength = parts.reduce((sum, p) => sum + p.length * p.quantity, 0);
      const totalMaterialLength = materials.reduce((sum, m) => sum + m.length, 0);
      
      // 如果材料不足，增加材料
      if (totalMaterialLength < totalPartLength * 0.7) {
        const additionalMaterialsNeeded = Math.ceil((totalPartLength * 0.8 - totalMaterialLength) / mergedConfig.materialLength.max);
        for (let i = 0; i < additionalMaterialsNeeded; i++) {
          materials.push({
            id: `M${materials.length + 1}-${Date.now()}-extra-${i}`,
            length: mergedConfig.materialLength.max
          });
        }
      }
    }

    return { materials, parts };
  }

  /**
   * 生成預設測試場景
   */
  generatePresetScenarios(): PresetScenario[] {
    const scenarios: PresetScenario[] = [];

    // 簡單場景
    scenarios.push({
      name: '簡單場景',
      description: '少量材料和零件，無角度',
      scenario: {
        materials: [
          { id: 'M1-simple', length: 6000 },
          { id: 'M2-simple', length: 9000 },
          { id: 'M3-simple', length: 12000 }
        ],
        parts: [
          { id: 'P1-simple', length: 2000, quantity: 3 },
          { id: 'P2-simple', length: 3000, quantity: 2 },
          { id: 'P3-simple', length: 1500, quantity: 4 },
          { id: 'P4-simple', length: 4000, quantity: 1 }
        ]
      }
    });

    // 複雜角度場景（符合新規則）
    scenarios.push({
      name: '複雜角度場景',
      description: '包含多種角度配置，測試共刀優化',
      scenario: {
        materials: [
          { id: 'M1-complex', length: 6000 },
          { id: 'M2-complex', length: 9000 },
          { id: 'M3-complex', length: 12000 },
          { id: 'M4-complex', length: 10000 } // 使用標準長度
        ],
        parts: [
          { 
            id: 'P1-complex', 
            length: 2000, 
            quantity: 3,
            angles: { topLeft: 33, topRight: 33, bottomLeft: 0, bottomRight: 0 }
          },
          { 
            id: 'P2-complex', 
            length: 2500, 
            quantity: 2,
            angles: { topLeft: 35, topRight: 0, bottomLeft: 0, bottomRight: 0 } // 修正：左側不能同時有上下角度
          },
          { 
            id: 'P3-complex', 
            length: 3000, 
            quantity: 2,
            angles: { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 } // 修正：只有頂部角度
          },
          { 
            id: 'P4-complex', 
            length: 1800, 
            quantity: 4,
            angles: { topLeft: 0, topRight: 33, bottomLeft: 0, bottomRight: 0 } // 修正：右側只有上角度
          },
          { 
            id: 'P5-complex', 
            length: 2200, 
            quantity: 3,
            angles: { topLeft: 60, topRight: 60, bottomLeft: 0, bottomRight: 0 }
          },
          { 
            id: 'P6-complex', 
            length: 1500, 
            quantity: 2,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 45 } // 底部斜切
          }
        ]
      }
    });

    // 大規模場景
    const largeMaterials = this.generateRandomMaterials(15);
    const largeParts = this.generateRandomParts(30);
    
    scenarios.push({
      name: '大規模場景',
      description: '大量材料和零件，測試性能',
      scenario: {
        materials: largeMaterials,
        parts: largeParts
      }
    });

    // 混合場景
    scenarios.push({
      name: '混合場景',
      description: '結合各種情況的綜合測試',
      scenario: this.generateTestScenario({
        materialCount: { min: 5, max: 10 },
        partCount: { min: 10, max: 20 }
      })
    });

    return scenarios;
  }

  /**
   * 合併配置
   */
  private mergeConfig(
    defaultConfig: Required<TestScenarioConfig>,
    userConfig?: TestScenarioConfig
  ): Required<TestScenarioConfig> {
    if (!userConfig) return defaultConfig;

    return {
      materialCount: {
        min: Math.max(1, Math.min(
          userConfig.materialCount?.min ?? defaultConfig.materialCount.min,
          userConfig.materialCount?.max ?? defaultConfig.materialCount.max
        )),
        max: Math.max(1, Math.max(
          userConfig.materialCount?.min ?? defaultConfig.materialCount.min,
          userConfig.materialCount?.max ?? defaultConfig.materialCount.max
        ))
      },
      partCount: {
        min: Math.max(1, Math.min(
          userConfig.partCount?.min ?? defaultConfig.partCount.min,
          userConfig.partCount?.max ?? defaultConfig.partCount.max
        )),
        max: Math.max(1, Math.max(
          userConfig.partCount?.min ?? defaultConfig.partCount.min,
          userConfig.partCount?.max ?? defaultConfig.partCount.max
        ))
      },
      materialLength: {
        min: Math.max(100, Math.min(
          userConfig.materialLength?.min ?? defaultConfig.materialLength.min,
          userConfig.materialLength?.max ?? defaultConfig.materialLength.max
        )),
        max: Math.min(20000, Math.max(
          userConfig.materialLength?.min ?? defaultConfig.materialLength.min,
          userConfig.materialLength?.max ?? defaultConfig.materialLength.max
        ))
      },
      partLength: {
        min: Math.max(10, Math.min(
          userConfig.partLength?.min ?? defaultConfig.partLength.min,
          userConfig.partLength?.max ?? defaultConfig.partLength.max
        )),
        max: Math.min(20000, Math.max(
          userConfig.partLength?.min ?? defaultConfig.partLength.min,
          userConfig.partLength?.max ?? defaultConfig.partLength.max
        ))
      }
    };
  }

  /**
   * 簡單的隨機數生成器
   */
  private random(min: number, max: number): number {
    // 使用線性同餘生成器
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    const normalized = this.seed / 2147483647;
    return Math.floor(normalized * (max - min + 1)) + min;
  }
}