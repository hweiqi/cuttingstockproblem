"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexChainBuilder = void 0;
const FlexibleAngleMatcher_1 = require("../matchers/FlexibleAngleMatcher");
class ComplexChainBuilder {
    constructor() {
        this.chainIdCounter = 0;
        this.matcher = new FlexibleAngleMatcher_1.FlexibleAngleMatcher();
    }
    /**
     * Build complex chains that can include multiple angles and branching
     */
    buildChains(parts) {
        // Expand parts by quantity
        const instances = this.expandPartsByQuantity(parts);
        if (instances.length < 2) {
            return [];
        }
        const chains = [];
        // Build chains using a graph-based approach
        while (this.hasUnusedParts(instances)) {
            const chain = this.buildBestChain(instances);
            if (chain && chain.parts.length >= 2) {
                chains.push(chain);
                // Mark parts as used
                for (const chainPart of chain.parts) {
                    const instance = instances.find(i => i.part.id === chainPart.partId && i.instanceId === chainPart.instanceId);
                    if (instance) {
                        instance.used = true;
                    }
                }
            }
            else {
                break;
            }
        }
        return chains;
    }
    expandPartsByQuantity(parts) {
        const instances = [];
        for (const part of parts) {
            for (let i = 0; i < part.quantity; i++) {
                instances.push({
                    part,
                    instanceId: i,
                    used: false
                });
            }
        }
        return instances;
    }
    hasUnusedParts(instances) {
        const unused = instances.filter(i => !i.used);
        return unused.length >= 2;
    }
    buildBestChain(instances) {
        const unused = instances.filter(i => !i.used);
        let bestChain = null;
        let maxSavings = 0;
        // Try starting from each unused part
        for (const startInstance of unused) {
            const chain = this.buildChainFrom(startInstance, instances);
            if (chain && chain.totalSavings > maxSavings) {
                maxSavings = chain.totalSavings;
                bestChain = chain;
            }
        }
        return bestChain;
    }
    buildChainFrom(startInstance, allInstances) {
        const nodes = new Map();
        const startKey = this.getInstanceKey(startInstance);
        // Initialize with start node
        nodes.set(startKey, {
            part: startInstance,
            orientation: { isFlipped: false },
            connections: new Map()
        });
        // Used instances in this chain
        const usedInChain = new Set([startKey]);
        // Build chain by finding best connections
        let improved = true;
        while (improved) {
            improved = false;
            // Try to add connections from existing nodes
            const currentNodes = Array.from(nodes.values());
            for (const node of currentNodes) {
                const bestConnection = this.findBestConnection(node, allInstances, usedInChain);
                if (bestConnection) {
                    const targetKey = this.getInstanceKey(bestConnection.targetInstance);
                    // Add new node if not exists
                    if (!nodes.has(targetKey)) {
                        nodes.set(targetKey, {
                            part: bestConnection.targetInstance,
                            orientation: bestConnection.match.part2Orientation,
                            connections: new Map()
                        });
                    }
                    // Add connection
                    const connection = this.createConnection(node, nodes.get(targetKey), bestConnection.match);
                    node.connections.set(targetKey, connection);
                    usedInChain.add(targetKey);
                    improved = true;
                }
            }
        }
        // Convert to ComplexChain
        if (nodes.size >= 2) {
            return this.nodesToChain(nodes);
        }
        return null;
    }
    findBestConnection(node, allInstances, usedInChain) {
        let bestConnection = null;
        let maxSavings = 0;
        for (const instance of allInstances) {
            if (instance.used)
                continue;
            const key = this.getInstanceKey(instance);
            if (usedInChain.has(key))
                continue;
            // Find all possible matches
            const matches = this.matcher.findAllPossibleMatches(node.part.part, instance.part);
            // Get best match
            if (matches.length > 0) {
                const bestMatch = matches[0]; // Already sorted by savings
                if (bestMatch.savings > maxSavings) {
                    maxSavings = bestMatch.savings;
                    bestConnection = {
                        targetInstance: instance,
                        match: bestMatch
                    };
                }
            }
        }
        return bestConnection;
    }
    createConnection(fromNode, toNode, match) {
        return {
            fromPart: {
                partId: fromNode.part.part.id,
                instanceId: fromNode.part.instanceId,
                orientation: fromNode.orientation,
                position: 0 // Will be set when converting to chain
            },
            toPart: {
                partId: toNode.part.part.id,
                instanceId: toNode.part.instanceId,
                orientation: toNode.orientation,
                position: 0 // Will be set when converting to chain
            },
            fromSide: match.part1Position.side,
            toSide: match.part2Position.side,
            sharedAngle: match.angle,
            savings: match.savings
        };
    }
    nodesToChain(nodes) {
        const parts = [];
        const connections = [];
        let position = 0;
        // Convert nodes to parts and connections
        const nodeArray = Array.from(nodes.values());
        for (const node of nodeArray) {
            const part = {
                partId: node.part.part.id,
                instanceId: node.part.instanceId,
                orientation: node.orientation,
                position: position++
            };
            parts.push(part);
            // Add connections
            for (const conn of node.connections.values()) {
                conn.fromPart.position = part.position;
                connections.push(conn);
            }
        }
        // Update connection positions
        for (const conn of connections) {
            const toPart = parts.find(p => p.partId === conn.toPart.partId &&
                p.instanceId === conn.toPart.instanceId);
            if (toPart) {
                conn.toPart.position = toPart.position;
            }
        }
        // Calculate totals
        const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
        const totalLength = this.calculateChainLength(parts, connections, nodes);
        // Determine structure
        const structure = this.determineStructure(connections);
        return {
            id: `chain_${this.chainIdCounter++}`,
            parts,
            connections,
            totalLength,
            totalSavings: Math.round(totalSavings * 100) / 100,
            structure
        };
    }
    calculateChainLength(parts, connections, nodes) {
        let totalLength = 0;
        // Add part lengths
        for (const part of parts) {
            const key = `${part.partId}_${part.instanceId}`;
            const node = nodes.get(key);
            if (node) {
                totalLength += node.part.part.length;
            }
        }
        // Subtract savings from connections
        const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
        return totalLength - totalSavings;
    }
    determineStructure(connections) {
        // Count connections per part
        const connectionCount = new Map();
        for (const conn of connections) {
            const fromKey = `${conn.fromPart.partId}_${conn.fromPart.instanceId}`;
            const toKey = `${conn.toPart.partId}_${conn.toPart.instanceId}`;
            connectionCount.set(fromKey, (connectionCount.get(fromKey) || 0) + 1);
            connectionCount.set(toKey, (connectionCount.get(toKey) || 0) + 1);
        }
        // If any part has more than 2 connections, it's branched
        for (const count of connectionCount.values()) {
            if (count > 2) {
                return 'branched';
            }
        }
        return 'linear';
    }
    getInstanceKey(instance) {
        return `${instance.part.id}_${instance.instanceId}`;
    }
}
exports.ComplexChainBuilder = ComplexChainBuilder;
