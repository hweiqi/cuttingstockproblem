import { MaterialService } from '../../../services/MaterialService';

describe('MaterialService - Duplicate Length Validation', () => {
  let service: MaterialService;

  beforeEach(() => {
    service = new MaterialService();
  });

  describe('Duplicate Length Prevention', () => {
    it('should not allow adding materials with duplicate lengths', () => {
      // Add first material
      const material1 = service.addMaterial(6000);
      expect(material1).toBeDefined();
      expect(material1.length).toBe(6000);

      // Try to add material with same length
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
    });

    it('should allow adding materials with different lengths', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);
      const material3 = service.addMaterial(12000);

      expect(service.getAllMaterials()).toHaveLength(3);
      expect(material1.length).toBe(6000);
      expect(material2.length).toBe(9000);
      expect(material3.length).toBe(12000);
    });

    it('should prevent duplicate lengths across multiple operations', () => {
      service.addMaterial(6000);
      service.addMaterial(9000);

      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
      expect(() => service.addMaterial(9000)).toThrow('長度 9000mm 已存在');

      // Can still add new lengths
      expect(() => service.addMaterial(12000)).not.toThrow();
    });
  });

  describe('Clear All and Duplicate Validation', () => {
    it('should allow adding same length after clear all', () => {
      // Add materials
      service.addMaterial(6000);
      service.addMaterial(9000);

      // Clear all
      service.clearAllMaterials();

      // Should be able to add same lengths again
      expect(() => service.addMaterial(6000)).not.toThrow();
      expect(() => service.addMaterial(9000)).not.toThrow();
    });

    it('should prevent duplicates after clear all within same session', () => {
      // Clear to ensure clean state
      service.clearAllMaterials();

      // Add material
      service.addMaterial(6000);

      // Should not allow duplicate
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
    });

    it('should handle multiple clear and add cycles correctly', () => {
      // Cycle 1
      service.addMaterial(6000);
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');
      
      // Clear
      service.clearAllMaterials();

      // Cycle 2
      service.addMaterial(6000);
      expect(() => service.addMaterial(6000)).toThrow('長度 6000mm 已存在');

      // Clear again
      service.clearAllMaterials();

      // Cycle 3
      expect(() => service.addMaterial(6000)).not.toThrow();
    });
  });

  describe('Update Material Length', () => {
    it('should not allow updating to a duplicate length', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);

      // Try to update material2 to have same length as material1
      expect(() => service.updateMaterial(material2.id, 6000)).toThrow('長度 6000mm 已存在');
    });

    it('should allow updating to a unique length', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);

      // Update to a new unique length
      const updated = service.updateMaterial(material2.id, 12000);
      expect(updated).toBeDefined();
      expect(updated?.length).toBe(12000);
    });

    it('should allow updating to same length (no change)', () => {
      const material = service.addMaterial(6000);

      // Update to same length should be allowed
      const updated = service.updateMaterial(material.id, 6000);
      expect(updated).toBeDefined();
      expect(updated?.length).toBe(6000);
    });
  });

  describe('Test Scenario Loading', () => {
    it('should properly handle test scenario loading after clear', () => {
      // Initial materials
      service.addMaterial(6000);
      service.addMaterial(9000);

      // Clear all
      service.clearAllMaterials();

      // Simulate test scenario loading (no duplicates)
      const testScenario = [6000, 9000, 10000, 12000, 15000];
      const loadedMaterials = testScenario.map(length => service.addMaterial(length));

      expect(loadedMaterials).toHaveLength(5);
      expect(service.getAllMaterials()).toHaveLength(5);

      // Verify no duplicates allowed
      testScenario.forEach(length => {
        expect(() => service.addMaterial(length)).toThrow(`長度 ${length}mm 已存在`);
      });
    });

    it('should reject test scenarios with duplicate lengths', () => {
      // Clear to ensure clean state
      service.clearAllMaterials();

      // Try to load test scenario with duplicates
      const testScenarioWithDuplicates = [6000, 6000, 9000];

      // First 6000 should succeed
      expect(() => service.addMaterial(testScenarioWithDuplicates[0])).not.toThrow();
      
      // Second 6000 should fail
      expect(() => service.addMaterial(testScenarioWithDuplicates[1])).toThrow('長度 6000mm 已存在');
    });
  });

  describe('Edge Cases', () => {
    it('should handle removing materials correctly', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);

      // Remove material1
      service.removeMaterial(material1.id);

      // Should now be able to add 6000 again
      expect(() => service.addMaterial(6000)).not.toThrow();

      // But still cannot add 9000
      expect(() => service.addMaterial(9000)).toThrow('長度 9000mm 已存在');
    });

    it('should validate length values correctly', () => {
      // Test various invalid lengths
      expect(() => service.addMaterial(0)).toThrow();
      expect(() => service.addMaterial(-100)).toThrow();
      expect(() => service.addMaterial(100.5)).toThrow();
      expect(() => service.addMaterial(50)).toThrow(); // Too small (< 100)
      expect(() => service.addMaterial(25000)).toThrow(); // Too large (> 20000)
    });
  });
});