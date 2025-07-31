import { Material, Part, PartAngles } from '../types';
import { AngleValidator } from '../validators/AngleValidator';
import { MaterialValidator } from '../validators/MaterialValidator';

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
    const baseTime = Date.now();
    const standardLengths = [6000, 9000, 10000, 12000, 15000];
    const usedLengths = new Set<number>();
    
    // 如果需要的材料數量超過標準長度數，則生成額外的長度
    let availableLengths: number[] = [...standardLengths];
    
    if (lengthRange) {
      // 過濾符合範圍的長度
      availableLengths = availableLengths.filter(
        length => length >= lengthRange.min && length <= lengthRange.max
      );
      
      // 如果需要更多材料，生成額外的長度
      // 按照100mm的步長生成所有可能的長度
      for (let length = lengthRange.min; length <= lengthRange.max && availableLengths.length < count; length += 100) {
        if (!availableLengths.includes(length)) {
          availableLengths.push(length);
        }
      }
      
      // 如果還需要更多，使用50mm步長
      if (availableLengths.length < count) {
        for (let length = lengthRange.min + 50; length <= lengthRange.max && availableLengths.length < count; length += 100) {
          if (!availableLengths.includes(length)) {
            availableLengths.push(length);
          }
        }
      }
      
      // 如果還需要更多，使用25mm步長
      if (availableLengths.length < count) {
        for (let length = lengthRange.min + 25; length <= lengthRange.max && availableLengths.length < count; length += 50) {
          if (!availableLengths.includes(length)) {
            availableLengths.push(length);
          }
        }
      }
    } else {
      // 如果沒有指定範圍，生成標準長度的變體
      // 先添加每個標準長度的變體
      for (const baseLength of standardLengths) {
        for (let variation = -1000; variation <= 1000 && availableLengths.length < count; variation += 100) {
          const newLength = baseLength + variation;
          if (newLength > 0 && !availableLengths.includes(newLength)) {
            availableLengths.push(newLength);
          }
        }
      }
    }
    
    // 生成指定數量的材料
    for (let i = 0; i < count && i < availableLengths.length; i++) {
      // 從可用長度中隨機選擇一個未使用的
      const availableForSelection = availableLengths.filter(len => !usedLengths.has(len));
      if (availableForSelection.length === 0) break;
      
      const randomIndex = this.random(0, availableForSelection.length - 1);
      const length = availableForSelection[randomIndex];
      usedLengths.add(length);
      
      materials.push({
        id: `M${i + 1}`,
        length: length
      });
    }
    
    return materials;
  }

  /**
   * 生成隨機零件
   */
  generateRandomParts(count: number, lengthRange?: { min: number; max: number }): Part[] {
    if (count <= 0) return [];

    const parts: Part[] = [];
    const baseTime = Date.now();
    
    // 為了提升大規模生成效能，採用批次生成
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, count);
      
      for (let i = startIdx; i < endIdx; i++) {
        const hasAngles = this.random(0, 100) < 40; // 40% 機率有角度
        // 使用提供的長度範圍或默認值
        const minLength = lengthRange?.min || 500;
        const maxLength = lengthRange?.max || 5000;
        const length = Math.round(this.random(minLength / 10, maxLength / 10)) * 10; // 10的倍數
        
        const part: Part = {
          id: `P${i + 1}`,
          length: length,
          quantity: this.random(1, 10)
        };

        if (hasAngles) {
          part.angles = this.generateRandomAngles();
        }

        parts.push(part);
      }
      
      // 每批次後稍微變更種子，避免重複
      if (batch % 10 === 0) {
        this.seed = (this.seed + batch) % 2147483647;
      }
    }

    return parts;
  }

  /**
   * 生成固定實例數量的隨機零件（用於精確測試）
   */
  generateRandomPartsWithFixedInstances(totalInstances: number, lengthRange?: { min: number; max: number }): Part[] {
    if (totalInstances <= 0) return [];

    const parts: Part[] = [];
    const baseTime = Date.now();
    const partTypes = Math.min(totalInstances, Math.ceil(totalInstances / 5)); // 每種零件平均5個實例
    
    const minLength = lengthRange?.min || 500;
    const maxLength = lengthRange?.max || 5000;
    
    let remainingInstances = totalInstances;
    
    for (let i = 0; i < partTypes && remainingInstances > 0; i++) {
      const hasAngles = this.random(0, 100) < 40; // 40% 機率有角度
      const length = Math.round(this.random(minLength / 10, maxLength / 10)) * 10; // 10的倍數
      
      // 計算這個零件的數量
      const isLastPart = i === partTypes - 1;
      const maxQuantity = Math.min(10, Math.ceil(remainingInstances / (partTypes - i)));
      const quantity = isLastPart 
        ? remainingInstances 
        : Math.min(remainingInstances, this.random(1, maxQuantity));
      
      const part: Part = {
        id: `P${i + 1}-${baseTime}-${i}`,
        length: length,
        quantity: quantity
      };

      if (hasAngles) {
        part.angles = this.generateRandomAngles();
      }

      parts.push(part);
      remainingInstances -= quantity;
      
      // 定期更新種子以增加隨機性
      if (i % 100 === 0) {
        this.seed = (this.seed + i) % 2147483647;
      }
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
   * 生成預設測試場景（只包含零件，不包含母材）
   */
  generatePresetScenarios(): PresetScenario[] {
    const scenarios: PresetScenario[] = [];

    // 簡單場景
    scenarios.push({
      name: '簡單場景',
      description: '少量零件，無角度',
      scenario: {
        materials: [], // 不提供母材
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
        materials: [], // 不提供母材
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
    const largeParts = this.generateRandomParts(30);
    
    scenarios.push({
      name: '大規模場景',
      description: '大量零件，測試性能',
      scenario: {
        materials: [], // 不提供母材
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
   * 生成測試場景
   */
  generateTestScenario(config?: TestScenarioConfig): TestScenario {
    const defaultConfig: Required<TestScenarioConfig> = {
      materialCount: { min: 3, max: 5 },
      partCount: { min: 5, max: 15 },
      materialLength: { min: 6000, max: 15000 },
      partLength: { min: 500, max: 5000 }
    };

    const mergedConfig = this.mergeConfig(defaultConfig, config);
    
    // 生成材料
    const materialCount = this.random(mergedConfig.materialCount.min, mergedConfig.materialCount.max);
    const materials = this.generateRandomMaterials(materialCount, mergedConfig.materialLength);
    
    // 生成零件
    const partCount = this.random(mergedConfig.partCount.min, mergedConfig.partCount.max);
    const parts = this.generateRandomParts(partCount, mergedConfig.partLength);
    
    return {
      materials,
      parts
    };
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