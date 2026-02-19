import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractArmyMetadata,
  extractUnits,
  extractModels,
  extractWeapons,
  extractAndLinkRules,
  type NewRecruitRoster,
  type UnitData,
  type ModelData,
  type WeaponData
} from '../lib/army-import';

vi.mock('../lib/db', () => ({
  db: {
    transact: async (_transactions: any[]) => Promise.resolve(),
    queryOnce: async (_query: any) => Promise.resolve({ data: { rules: [] } }),
    tx: {
      armies: {},
      units: {},
      models: {},
      weapons: {},
      rules: {}
    }
  }
}));

function createStrictMockDb() {
  const existingRules: any[] = [];
  const existingLinks = new Set<string>();

  const mkEntityProxy = (entity: string) => new Proxy({}, {
    get: (_target, prop) => ({
      update: (data: any) => ({
        type: `${entity}-update`,
        entity,
        id: String(prop),
        data,
        link: (links: any) => ({
          type: `${entity}-update`,
          entity,
          id: String(prop),
          data,
          links
        })
      }),
      link: (links: any) => ({
        type: `${entity}-link`,
        entity,
        id: String(prop),
        links
      })
    })
  });

  return {
    async queryOnce(_query: any) {
      return { data: { rules: existingRules } };
    },
    async transact(transactions: any[]) {
      for (const tx of transactions) {
        if (tx.type === 'rules-update') {
          existingRules.push({
            id: tx.id,
            ...tx.data
          });
        }

        if (tx.links) {
          const labels = Object.keys(tx.links);
          for (const label of labels) {
            const value = tx.links[label];
            const linkKey = `${tx.entity}:${tx.id}:${label}:${String(value)}`;
            if (existingLinks.has(linkKey)) {
              throw { code: 'duplicate_link', linkKey };
            }
            existingLinks.add(linkKey);
          }
        }
      }
      return Promise.resolve();
    },
    tx: {
      armies: mkEntityProxy('armies'),
      units: mkEntityProxy('units'),
      models: mkEntityProxy('models'),
      weapons: mkEntityProxy('weapons'),
      rules: mkEntityProxy('rules')
    }
  };
}

function buildExtractedData(fileName: string): {
  sourceData: string;
  faction: string;
  armyId: string;
  units: UnitData[];
  models: ModelData[];
  weapons: WeaponData[];
} {
  const filePath = path.join(process.cwd(), 'test_data', fileName);
  const sourceData = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(sourceData) as NewRecruitRoster;
  const armyMetadata = extractArmyMetadata(jsonData, 'test-user');
  const units = extractUnits(jsonData, armyMetadata.id, 'test-user');

  const models: ModelData[] = [];
  for (const unit of units) {
    models.push(...extractModels(unit));
  }

  const weapons: WeaponData[] = [];
  for (const unit of units) {
    const unitModels = models.filter(m => m.unitId === unit.id);
    weapons.push(...extractWeapons(unit, unitModels));
  }

  return {
    sourceData,
    faction: armyMetadata.faction,
    armyId: armyMetadata.id,
    units,
    models,
    weapons
  };
}

describe('Army import rule linking dedupe', () => {
  it('does not attempt duplicate unit/model/weapon rule links for Speed Freeks import', async () => {
    const strictDb = createStrictMockDb();
    const data = buildExtractedData('speed_freeks_no_warboss.json');

    await expect(extractAndLinkRules({
      armyId: data.armyId,
      faction: data.faction,
      sourceData: data.sourceData,
      units: data.units,
      models: data.models,
      weapons: data.weapons,
      dbClient: strictDb as any
    })).resolves.toBeDefined();
  });

  it('does not attempt duplicate unit/model/weapon rule links for Death Guard import', async () => {
    const strictDb = createStrictMockDb();
    const data = buildExtractedData('death_guard_mortarions_hammer.json');

    await expect(extractAndLinkRules({
      armyId: data.armyId,
      faction: data.faction,
      sourceData: data.sourceData,
      units: data.units,
      models: data.models,
      weapons: data.weapons,
      dbClient: strictDb as any
    })).resolves.toBeDefined();
  });
});
