import { PartService } from '../../../services/PartService';
import { Part } from '../../../types';

describe('PartService - Clear All Functionality', () => {
  let service: PartService;

  beforeEach(() => {
    service = new PartService();
  });

  describe('clearAllParts', () => {
    it('should clear all parts', () => {
      // Add some parts
      service.addPart(1000, 2);
      service.addPart(2000, 3);
      service.addPart(3000, 1);
      
      expect(service.getAllParts()).toHaveLength(3);
      expect(service.getTotalPartsCount()).toBe(6);
      
      // Clear all
      service.clearAllParts();
      
      expect(service.getAllParts()).toHaveLength(0);
      expect(service.getTotalPartsCount()).toBe(0);
    });

    it('should reset ID counter after clearing', async () => {
      // Add a part
      const part1 = service.addPart(1000, 1);
      const id1 = part1.id;
      
      // Clear all
      service.clearAllParts();
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Add another part
      const part2 = service.addPart(1000, 1);
      const id2 = part2.id;
      
      // ID counter should reset, so both should be P1
      expect(id1).toBe('P1');
      expect(id2).toBe('P1');
    });

    it('should allow adding same parts after clearing', () => {
      // Add parts
      service.addPart(1000, 2);
      service.addPart(2000, 3);
      
      // Clear all
      service.clearAllParts();
      
      // Should be able to add same parts again
      expect(() => service.addPart(1000, 2)).not.toThrow();
      expect(() => service.addPart(2000, 3)).not.toThrow();
      
      expect(service.getAllParts()).toHaveLength(2);
    });

    it('should allow multiple parts with same length', () => {
      // This is important - we should be able to add multiple parts with the same length
      expect(() => service.addPart(1000, 1)).not.toThrow();
      expect(() => service.addPart(1000, 2)).not.toThrow();
      expect(() => service.addPart(1000, 3)).not.toThrow();
      
      const parts = service.getAllParts();
      expect(parts).toHaveLength(3);
      expect(parts.every(p => p.length === 1000)).toBe(true);
    });

    it('should handle test scenario loading after clear', () => {
      // Simulate loading a test scenario
      const testParts = [
        { length: 1000, quantity: 2 },
        { length: 1000, quantity: 3 },
        { length: 2000, quantity: 1 },
        { length: 2000, quantity: 2 },
        { length: 3000, quantity: 4 }
      ];
      
      // Add initial parts
      service.addPart(1000, 1);
      service.addPart(2000, 1);
      
      // Clear all
      service.clearAllParts();
      
      // Load test scenario
      const loadedParts: Part[] = [];
      testParts.forEach(part => {
        const added = service.addPart(part.length, part.quantity);
        loadedParts.push(added);
      });
      
      expect(loadedParts).toHaveLength(5);
      expect(service.getAllParts()).toHaveLength(5);
      expect(service.getTotalPartsCount()).toBe(12);
    });

    it('should handle parts with angles', () => {
      const angles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 45
      };
      
      // Add parts with angles
      service.addPart(1000, 1, angles);
      service.addPart(2000, 2, angles);
      
      expect(service.getAllParts()).toHaveLength(2);
      
      // Clear all
      service.clearAllParts();
      
      // Should be able to add parts with angles again
      expect(() => service.addPart(1000, 1, angles)).not.toThrow();
      expect(() => service.addPart(2000, 2, angles)).not.toThrow();
      
      const parts = service.getAllParts();
      expect(parts).toHaveLength(2);
      expect(parts[0].angles).toEqual(angles);
      expect(parts[1].angles).toEqual(angles);
    });

    it('should not interfere with other services', () => {
      // Add parts
      const part1 = service.addPart(1000, 2);
      const part2 = service.addPart(2000, 3);
      
      // Get parts before clearing
      const beforeClear = service.getAllParts();
      expect(beforeClear).toHaveLength(2);
      
      // Clear all
      service.clearAllParts();
      
      // Verify parts are gone
      expect(service.getPart(part1.id)).toBeUndefined();
      expect(service.getPart(part2.id)).toBeUndefined();
      expect(service.getAllParts()).toHaveLength(0);
    });

    it('should handle multiple clear operations', () => {
      // Add parts
      service.addPart(1000, 2);
      service.addPart(2000, 3);
      
      // Clear multiple times
      service.clearAllParts();
      service.clearAllParts(); // Should not throw
      service.clearAllParts(); // Should not throw
      
      expect(service.getAllParts()).toHaveLength(0);
      
      // Should still be able to add parts
      expect(() => service.addPart(1000, 1)).not.toThrow();
      expect(service.getAllParts()).toHaveLength(1);
    });

    it('should handle edge cases', () => {
      // Clear when empty
      service.clearAllParts();
      expect(service.getAllParts()).toHaveLength(0);
      
      // Add after clearing empty
      expect(() => service.addPart(1000, 1)).not.toThrow();
      expect(service.getAllParts()).toHaveLength(1);
    });
  });

  describe('Part uniqueness and validation', () => {
    it('should allow parts with same length and quantity', () => {
      const part1 = service.addPart(1000, 5);
      const part2 = service.addPart(1000, 5);
      const part3 = service.addPart(1000, 5);
      
      // All should have same length and quantity
      expect(part1.length).toBe(1000);
      expect(part2.length).toBe(1000);
      expect(part3.length).toBe(1000);
      expect(part1.quantity).toBe(5);
      expect(part2.quantity).toBe(5);
      expect(part3.quantity).toBe(5);
      
      // But different IDs
      expect(part1.id).not.toBe(part2.id);
      expect(part1.id).not.toBe(part3.id);
      expect(part2.id).not.toBe(part3.id);
      
      // All should be stored
      expect(service.getAllParts()).toHaveLength(3);
      expect(service.getTotalPartsCount()).toBe(15);
    });

    it('should validate part length correctly', () => {
      expect(() => service.addPart(0, 1)).toThrow('Part length must be greater than 0');
      expect(() => service.addPart(-100, 1)).toThrow('Part length must be greater than 0');
      expect(() => service.addPart(100.5, 1)).toThrow('Part length must be an integer');
    });

    it('should validate part quantity correctly', () => {
      expect(() => service.addPart(1000, 0)).toThrow('Part quantity must be greater than 0');
      expect(() => service.addPart(1000, -5)).toThrow('Part quantity must be greater than 0');
      expect(() => service.addPart(1000, 2.5)).toThrow('Part quantity must be an integer');
    });
  });
});