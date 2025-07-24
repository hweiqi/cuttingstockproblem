import { MaterialService } from '../../../services/MaterialService';
import { Material } from '../../../types';

describe('MaterialService - Clear All Functionality', () => {
  let service: MaterialService;

  beforeEach(() => {
    service = new MaterialService();
  });

  describe('clearAllMaterials', () => {
    it('should clear all materials', () => {
      // Add some materials
      service.addMaterial(6000);
      service.addMaterial(9000);
      service.addMaterial(12000);
      
      expect(service.getAllMaterials()).toHaveLength(3);
      
      // Clear all
      service.clearAllMaterials();
      
      expect(service.getAllMaterials()).toHaveLength(0);
    });

    it('should reset ID counter after clearing', async () => {
      // Add a material
      const material1 = service.addMaterial(6000);
      const id1 = material1.id;
      
      // Clear all
      service.clearAllMaterials();
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Add another material
      const material2 = service.addMaterial(6000);
      const id2 = material2.id;
      
      // IDs should be different (because of timestamp)
      expect(id1).not.toBe(id2);
      
      // But the counter part should reset (check if ID starts with material-1)
      expect(id2).toMatch(/^material-1-/);
    });

    it('should allow adding same length materials after clearing', () => {
      // Add materials
      service.addMaterial(6000);
      service.addMaterial(9000);
      
      // Clear all
      service.clearAllMaterials();
      
      // Should be able to add same lengths again
      expect(() => service.addMaterial(6000)).not.toThrow();
      expect(() => service.addMaterial(9000)).not.toThrow();
      
      expect(service.getAllMaterials()).toHaveLength(2);
    });

    it('should not allow multiple materials with same length', () => {
      // First material should succeed
      expect(() => service.addMaterial(6000)).not.toThrow();
      
      // Second material with same length should fail
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
      
      // Material with different length should succeed
      expect(() => service.addMaterial(9000)).not.toThrow();
      
      const materials = service.getAllMaterials();
      expect(materials).toHaveLength(2);
    });

    it('should handle test scenario loading after clear', () => {
      // Simulate loading a test scenario
      const testMaterials = [
        { length: 6000 },
        { length: 9000 },
        { length: 10000 },
        { length: 12000 },
        { length: 15000 }
      ];
      
      // Add initial materials
      service.addMaterial(6000);
      service.addMaterial(9000);
      
      // Clear all
      service.clearAllMaterials();
      
      // Load test scenario
      const loadedMaterials: Material[] = [];
      testMaterials.forEach(mat => {
        const added = service.addMaterial(mat.length);
        loadedMaterials.push(added);
      });
      
      expect(loadedMaterials).toHaveLength(5);
      expect(service.getAllMaterials()).toHaveLength(5);
    });

    it('should not interfere with other services', () => {
      // Add materials
      const mat1 = service.addMaterial(6000);
      const mat2 = service.addMaterial(9000);
      
      // Get materials before clearing
      const beforeClear = service.getAllMaterials();
      expect(beforeClear).toHaveLength(2);
      
      // Clear all
      service.clearAllMaterials();
      
      // Verify materials are gone
      expect(service.getMaterial(mat1.id)).toBeUndefined();
      expect(service.getMaterial(mat2.id)).toBeUndefined();
      expect(service.getAllMaterials()).toHaveLength(0);
    });

    it('should handle multiple clear operations', () => {
      // Add materials
      service.addMaterial(6000);
      service.addMaterial(9000);
      
      // Clear multiple times
      service.clearAllMaterials();
      service.clearAllMaterials(); // Should not throw
      service.clearAllMaterials(); // Should not throw
      
      expect(service.getAllMaterials()).toHaveLength(0);
      
      // Should still be able to add materials
      expect(() => service.addMaterial(6000)).not.toThrow();
      expect(service.getAllMaterials()).toHaveLength(1);
    });

    it('should handle edge cases', () => {
      // Clear when empty
      service.clearAllMaterials();
      expect(service.getAllMaterials()).toHaveLength(0);
      
      // Add after clearing empty
      expect(() => service.addMaterial(6000)).not.toThrow();
      expect(service.getAllMaterials()).toHaveLength(1);
    });
  });

  describe('Material uniqueness', () => {
    it('should enforce unique material lengths', () => {
      const mat1 = service.addMaterial(6000);
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
      
      const mat2 = service.addMaterial(9000);
      expect(() => service.addMaterial(9000)).toThrow('長度 9000mm 已存在');
      
      const mat3 = service.addMaterial(12000);
      
      // All should have different lengths
      expect(mat1.length).toBe(6000);
      expect(mat2.length).toBe(9000);
      expect(mat3.length).toBe(12000);
      
      // All should have different IDs
      expect(mat1.id).not.toBe(mat2.id);
      expect(mat1.id).not.toBe(mat3.id);
      expect(mat2.id).not.toBe(mat3.id);
      
      // All should be stored
      expect(service.getAllMaterials()).toHaveLength(3);
    });

    it('should handle standard material lengths scenario', () => {
      // Standard lengths from STANDARD_MATERIAL_LENGTHS
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      
      // Should be able to add one of each standard length
      standardLengths.forEach(length => {
        expect(() => service.addMaterial(length)).not.toThrow();
      });
      
      expect(service.getAllMaterials()).toHaveLength(5);
      
      // Should not be able to add duplicates
      standardLengths.forEach(length => {
        expect(() => service.addMaterial(length)).toThrow(`長度 ${length}mm 已存在`);
      });
    });
  });
});