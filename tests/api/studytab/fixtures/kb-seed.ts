/**
 * KB Seed Fixture — creates rich test data for M3 Knowledge Base tests.
 *
 * Creates: folder → 2 documents (biology + chemistry) → deck → cards
 * All resources are tracked for automatic cleanup.
 */
import { APIRequestContext } from '@playwright/test';

// ─── Content ──────────────────────────────────────────────────────────────────

export const BIOLOGY_CONTENT = `# Cell Biology

## Mitochondria
The mitochondria is the powerhouse of the cell. It generates most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy. Mitochondria have their own DNA, called mitochondrial DNA (mtDNA), which is inherited maternally.

## Cell Membrane
The cell membrane is a biological membrane that separates the interior of all cells from the outside environment. It is selectively permeable to ions and organic molecules. The basic function of the cell membrane is to protect the cell from its surroundings.

### Structure
The cell membrane consists of a lipid bilayer, including cholesterol that sits between phospholipids. The membrane also contains membrane proteins, including integral proteins that span the membrane and peripheral proteins that are loosely attached.

## Photosynthesis
Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy. The equation is: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.

### Light-Dependent Reactions
These reactions occur in the thylakoid membranes and require direct light to produce ATP and NADPH.

### Calvin Cycle
The Calvin cycle uses ATP and NADPH from the light reactions to fix carbon dioxide into glucose. This cycle occurs in the stroma of the chloroplast.

## DNA Replication
DNA replication is the biological process of producing two identical replicas of DNA from one original DNA molecule. Key enzymes include helicase (unwinds), primase (adds RNA primer), DNA polymerase (adds nucleotides), and ligase (joins fragments).

### Leading vs Lagging Strand
The leading strand is synthesized continuously in the 5' to 3' direction. The lagging strand is synthesized in Okazaki fragments, which are later joined by DNA ligase.`;

export const CHEMISTRY_CONTENT = `# Chemistry Basics

## Atoms and Molecules
An atom is the smallest unit of ordinary matter. Atoms are composed of protons (positive), neutrons (neutral), and electrons (negative). The number of protons defines the element.

## Chemical Bonds
### Ionic Bonds
Formed by the transfer of electrons. Example: NaCl — sodium loses an electron, chlorine gains one.

### Covalent Bonds
Formed by sharing electrons. Example: H₂O — oxygen shares electrons with two hydrogen atoms.

### Hydrogen Bonds
Weak bonds between a hydrogen atom and an electronegative atom (O, N, F). Critical in DNA structure and water properties.

## Periodic Table
Elements are arranged by atomic number. Rows are periods, columns are groups. Elements in the same group share similar chemical properties.

## Chemical Reactions
Reactants → Products. Conservation of mass: atoms are rearranged, not created or destroyed. The rate of reaction depends on: concentration, temperature, surface area, catalysts.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KBSeedResult {
  folderId: string;
  documentId1: string;  // Biology
  documentId2: string;  // Chemistry
  deckId: string;
  cardIds: string[];
}

interface ApiConfig { apiUrl: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const api = (cfg: ApiConfig, path: string) => `${cfg.apiUrl}/api/v1${path}`;

async function jsonOrNull(res: any) {
  try { return await res.json(); } catch { return null; }
}

/** Parse an SSE response body into collected text.
 *  Handles both plain SSE text and Playwright's buffer-serialized format. */
export function collectSSEText(body: string): string {
  // If Playwright returned buffer-serialized data (JSON objects with numeric keys),
  // decode each "data: {...}" segment by converting byte values to string first.
  let decoded = body;
  if (body.includes('"0":') && !body.includes('event:')) {
    // Body is lines of "data: {0:101,1:118,...}" — decode byte arrays
    const parts: string[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const obj = JSON.parse(trimmed.slice(6));
          if (typeof obj === 'object' && obj !== null && '0' in obj) {
            const bytes = Object.keys(obj).sort((a, b) => +a - +b).map(k => obj[k]);
            parts.push(Buffer.from(bytes).toString());
          }
        } catch { /* skip */ }
      }
    }
    decoded = parts.join('');
  }

  // Now parse standard SSE format: "event: text\ndata: {"text":"..."}\n\n"
  const lines = decoded.split('\n');
  let text = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.text) text += data.text;
      } catch { /* skip non-JSON lines */ }
    }
  }
  return text;
}

/** Check if an AI call failed due to missing API key / provider config */
export function isAIProviderError(status: number, body: any): boolean {
  if (status >= 500) return true;
  const msg = (body?.error?.message ?? '').toLowerCase();
  return msg.includes('api key') || msg.includes('api_key') ||
    msg.includes('unauthorized') || msg.includes('provider') ||
    msg.includes('not configured') || msg.includes('budget') ||
    msg.includes('rate limit') || msg.includes('quota');
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedKBEnvironment(
  request: APIRequestContext,
  cfg: ApiConfig,
  cleanup: any,
): Promise<KBSeedResult> {
  const prefix = `m3-test-${Date.now()}`;

  // 1. Create folder
  const folderRes = await request.post(api(cfg, '/folders'), {
    data: { name: `${prefix}-folder` },
  });
  const folder = (await folderRes.json()).data;
  cleanup.track({
    type: 'folder', id: folder.id, name: folder.name,
    deleteVia: 'api', deletePath: api(cfg, `/folders/${folder.id}`),
    project: 'studytab', createdAt: new Date(),
  });

  // 2. Create biology document
  const doc1Res = await request.post(api(cfg, '/documents'), {
    data: { title: `${prefix} Cell Biology Notes`, content: BIOLOGY_CONTENT, folderId: folder.id },
  });
  const doc1 = (await doc1Res.json()).data;

  // 3. Create chemistry document
  const doc2Res = await request.post(api(cfg, '/documents'), {
    data: { title: `${prefix} Chemistry Basics`, content: CHEMISTRY_CONTENT, folderId: folder.id },
  });
  const doc2 = (await doc2Res.json()).data;

  // 4. Create deck
  const deckRes = await request.post(api(cfg, '/decks'), {
    data: { name: `${prefix} M3 Test Deck`, description: 'Test deck for card generation' },
  });
  const deck = (await deckRes.json()).data ?? (await deckRes.json());
  cleanup.track({
    type: 'deck', id: deck.id, name: deck.name,
    deleteVia: 'api', deletePath: api(cfg, `/decks/${deck.id}`),
    project: 'studytab', createdAt: new Date(),
  });

  // 5. Create a few cards (simulates study history for weak area detection)
  const cardIds: string[] = [];
  const cards = [
    { front: 'What is the powerhouse of the cell?', back: 'Mitochondria', type: 'BASIC' },
    { front: 'What is the equation for photosynthesis?', back: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂', type: 'BASIC' },
    { front: 'DNA replication enzyme that unwinds the double helix', back: 'Helicase', type: 'BASIC' },
  ];
  for (const card of cards) {
    const cardRes = await request.post(api(cfg, '/cards'), {
      data: { deckId: deck.id, front: card.front, back: card.back, cardType: card.type },
    });
    const cardBody = await jsonOrNull(cardRes);
    if (cardBody?.data?.id) cardIds.push(cardBody.data.id);
    else if (cardBody?.id) cardIds.push(cardBody.id);
  }

  return {
    folderId: folder.id,
    documentId1: doc1.id,
    documentId2: doc2.id,
    deckId: deck.id,
    cardIds,
  };
}

export async function cleanupKBEnvironment(
  request: APIRequestContext,
  cfg: ApiConfig,
  seed: KBSeedResult,
): Promise<void> {
  // Cards are cascade-deleted with deck; documents with folder
  // Just delete deck and folder
  await request.delete(api(cfg, `/decks/${seed.deckId}`)).catch(() => {});
  await request.delete(api(cfg, `/folders/${seed.folderId}`)).catch(() => {});
}
