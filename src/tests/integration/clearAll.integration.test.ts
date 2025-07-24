import { MaterialService } from '../../services/MaterialService';
import { PartService } from '../../services/PartService';
import { Material, Part } from '../../types';

describe('Clear All Functionality - Integration Tests', () => {
  let materialService: MaterialService;
  let partService: PartService;

  beforeEach(() => {
    materialService = new MaterialService();
    partService = new PartService();
  });

  describe('Test Scenario Loading After Clear', () => {
    it('should handle complete test scenario loading after clear all', () => {
      // Step 1: Add initial data
      const initialMaterial1 = materialService.addMaterial(6000);
      const initialMaterial2 = materialService.addMaterial(9000);
      const initialPart1 = partService.addPart(1000, 2);
      const initialPart2 = partService.addPart(2000, 3);

      expect(materialService.getAllMaterials()).toHaveLength(2);
      expect(partService.getAllParts()).toHaveLength(2);

      // Step 2: Clear all
      materialService.clearAllMaterials();
      partService.clearAllParts();

      expect(materialService.getAllMaterials()).toHaveLength(0);
      expect(partService.getAllParts()).toHaveLength(0);

      // Step 3: Load test scenario (no duplicates)
      const testScenarioMaterials = [
        { length: 6000 },
        { length: 9000 },
        { length: 12000 },
      ];

      const testScenarioParts = [
        { length: 1000, quantity: 2 },
        { length: 1000, quantity: 3 },
        { length: 2000, quantity: 1 },
      ];

      // Should not throw when adding materials with same length
      const loadedMaterials: Material[] = [];
      testScenarioMaterials.forEach(mat => {
        const material = materialService.addMaterial(mat.length);
        loadedMaterials.push(material);
      });

      const loadedParts: Part[] = [];
      testScenarioParts.forEach(part => {
        const p = partService.addPart(part.length, part.quantity);
        loadedParts.push(p);
      });

      // Verify all loaded successfully
      expect(loadedMaterials).toHaveLength(3);
      expect(loadedParts).toHaveLength(3);
      expect(materialService.getAllMaterials()).toHaveLength(3);
      expect(partService.getAllParts()).toHaveLength(3);

      // Verify materials have different lengths
      const mat1 = loadedMaterials[0];
      const mat2 = loadedMaterials[1];
      const mat3 = loadedMaterials[2];
      expect(mat1.length).toBe(6000);
      expect(mat2.length).toBe(9000);
      expect(mat3.length).toBe(12000);
      expect(mat1.id).not.toBe(mat2.id);
      expect(mat1.id).not.toBe(mat3.id);
      expect(mat2.id).not.toBe(mat3.id);
    });

    it('should handle multiple clear and load cycles', () => {
      // Cycle 1
      materialService.addMaterial(6000);
      partService.addPart(1000, 1);
      
      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Cycle 2
      materialService.addMaterial(6000);
      materialService.addMaterial(9000);
      partService.addPart(1000, 1);
      partService.addPart(1000, 1);

      expect(materialService.getAllMaterials()).toHaveLength(2);
      expect(partService.getAllParts()).toHaveLength(2);

      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Cycle 3 - Load complete test scenario
      const materials = [
        materialService.addMaterial(6000),
        materialService.addMaterial(9000),
        materialService.addMaterial(10000),
        materialService.addMaterial(12000),
        materialService.addMaterial(15000)
      ];

      const parts = [
        partService.addPart(1000, 2),
        partService.addPart(1000, 3),
        partService.addPart(2000, 1),
        partService.addPart(2000, 2),
        partService.addPart(3000, 4)
      ];

      expect(materials).toHaveLength(5);
      expect(parts).toHaveLength(5);
      expect(materialService.getAllMaterials()).toHaveLength(5);
      expect(partService.getAllParts()).toHaveLength(5);
      expect(partService.getTotalPartsCount()).toBe(12);
    });

    it('should handle test scenario with parts having angles', () => {
      // Clear any existing data
      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Load test scenario
      const materials = [
        materialService.addMaterial(6000),
        materialService.addMaterial(9000)
      ];

      const angles1 = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 45
      };

      const angles2 = {
        topLeft: 0,
        topRight: 45,
        bottomLeft: 45,
        bottomRight: 0
      };

      const parts = [
        partService.addPart(1500, 2, angles1),
        partService.addPart(2500, 3, angles2),
        partService.addPart(3000, 1) // Part without angles
      ];

      expect(materials).toHaveLength(2);
      expect(parts).toHaveLength(3);
      expect(parts[0].angles).toEqual(angles1);
      expect(parts[1].angles).toEqual(angles2);
      expect(parts[2].angles).toBeUndefined();
    });

    it('should maintain data integrity across services after clear', async () => {
      // Add initial data
      const mat1 = materialService.addMaterial(6000);
      const mat2 = materialService.addMaterial(9000);
      const part1 = partService.addPart(1000, 2);
      const part2 = partService.addPart(2000, 3);

      // Store IDs
      const initialMatIds = [mat1.id, mat2.id];
      const initialPartIds = [part1.id, part2.id];

      // Clear all
      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Verify old IDs are no longer accessible
      initialMatIds.forEach(id => {
        expect(materialService.getMaterial(id)).toBeUndefined();
      });
      initialPartIds.forEach(id => {
        expect(partService.getPart(id)).toBeUndefined();
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      // Add new data
      const newMat1 = materialService.addMaterial(6000);
      const newMat2 = materialService.addMaterial(9000);
      const newPart1 = partService.addPart(1000, 2);
      const newPart2 = partService.addPart(1000, 3);

      // Verify new IDs are different from old ones
      expect(newMat1.id).not.toBe(mat1.id);
      expect(newMat2.id).not.toBe(mat2.id);
      expect(newPart1.id).not.toBe(part1.id);
      expect(newPart2.id).not.toBe(part2.id);

      // Verify new data is accessible
      expect(materialService.getMaterial(newMat1.id)).toBeDefined();
      expect(materialService.getMaterial(newMat2.id)).toBeDefined();
      expect(partService.getPart(newPart1.id)).toBeDefined();
      expect(partService.getPart(newPart2.id)).toBeDefined();
    });

    it('should handle standard material lengths scenario', () => {
      // Standard lengths from MaterialConfig
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      
      // Clear all
      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Load a realistic scenario with one of each standard length
      const materials: Material[] = [];
      
      // Add one of each standard length
      standardLengths.forEach(length => {
        materials.push(materialService.addMaterial(length));
      });

      // Add parts that would use these materials
      const parts: Part[] = [];
      
      // Small parts (would fit in 6000mm materials)
      parts.push(partService.addPart(1500, 3));
      parts.push(partService.addPart(2000, 2));
      parts.push(partService.addPart(2500, 2));
      
      // Medium parts (would need 9000mm or 10000mm materials)
      parts.push(partService.addPart(4000, 2));
      parts.push(partService.addPart(4500, 1));
      
      // Large parts (would need 12000mm or 15000mm materials)
      parts.push(partService.addPart(5500, 2));
      parts.push(partService.addPart(7000, 1));

      // Verify everything loaded correctly
      expect(materials).toHaveLength(5); // 1 of each standard length
      expect(parts).toHaveLength(7);
      expect(partService.getTotalPartsCount()).toBe(13);
      
      // Verify all standard lengths are represented
      const loadedLengths = materials.map(m => m.length);
      standardLengths.forEach(length => {
        const count = loadedLengths.filter(l => l === length).length;
        expect(count).toBe(1);
      });
    });
  });

  describe('Error Handling After Clear', () => {
    it('should not throw "長度 Xmm 已存在" error after clearing', () => {
      // This is the specific bug we're fixing
      materialService.addMaterial(6000);
      materialService.addMaterial(9000);
      
      materialService.clearAllMaterials();
      
      // Should not throw "長度 Xmm 已存在"
      expect(() => materialService.addMaterial(6000)).not.toThrow();
      expect(() => materialService.addMaterial(9000)).not.toThrow();
      expect(() => materialService.addMaterial(12000)).not.toThrow();
    });

    it('should validate inputs correctly after clear', () => {
      materialService.clearAllMaterials();
      partService.clearAllParts();

      // Material validation should still work
      expect(() => materialService.addMaterial(0)).toThrow();
      expect(() => materialService.addMaterial(-100)).toThrow();
      expect(() => materialService.addMaterial(100.5)).toThrow();

      // Part validation should still work
      expect(() => partService.addPart(0, 1)).toThrow();
      expect(() => partService.addPart(100, 0)).toThrow();
      expect(() => partService.addPart(100.5, 1)).toThrow();
      expect(() => partService.addPart(100, 1.5)).toThrow();
    });
  });
});