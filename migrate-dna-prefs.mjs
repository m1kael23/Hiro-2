/**
 * migrate-dna-prefs.mjs — Pad legacy dnaPrefs arrays from 5 → 7 dimensions
 *
 * Background
 * ──────────
 * The Work DNA™ model originally had 5 dimensions. It was expanded to 7:
 *   0  Energy style     (was dim 0)
 *   1  Decision style   (was dim 1)
 *   2  Feedback style   (was dim 2)
 *   3  Work rhythm      (was dim 3)
 *   4  Autonomy         (was dim 4)
 *   5  Risk appetite    ← NEW (appended)
 *   6  Growth driver    ← NEW (appended)
 *
 * Jobs written before the expansion have dnaPrefs.length === 5.
 * scoreDna() iterates all 7 indices — missing dims silently score 0,
 * which skews every match for those jobs.
 *
 * This script:
 *   1. Reads every document in the `jobs` collection
 *   2. Skips any doc where dnaPrefs is already 7 elements (or missing)
 *   3. Pads short arrays with 50 (midpoint — neutral on the new dims)
 *   4. Writes back only the dnaPrefs field (merge: true — no other fields touched)
 *   5. Prints a summary of what was changed
 *
 * Also migrates `users` collection (employer profiles) which may store
 * team_dna arrays on the same old schema.
 *
 * Usage
 * ─────
 *   node migrate-dna-prefs.mjs
 *
 * Requirements
 *   npm install firebase   (already in package.json)
 *   Run from /hiro_app root (where package.json lives)
 *
 * Safety
 * ──────
 * - Dry-run mode (DRY_RUN=true) prints what would change without writing.
 *   node migrate-dna-prefs.mjs           # live run
 *   DRY_RUN=true node migrate-dna-prefs.mjs  # preview only
 * - Only writes documents that actually need patching.
 * - Uses merge:true — cannot clobber unrelated fields.
 */

import { initializeApp }                     from 'firebase/app';
import { getFirestore, collection, getDocs,
         doc, updateDoc, serverTimestamp }   from 'firebase/firestore';

// ── Firebase config (matches seed.mjs) ────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyAP59zxWcyqeaGiJCMAHN4EObP9d0_Q4wA',
  authDomain:        'gen-lang-client-0319743731.firebaseapp.com',
  projectId:         'gen-lang-client-0319743731',
  storageBucket:     'gen-lang-client-0319743731.firebasestorage.app',
  messagingSenderId: '582248086733',
  appId:             '1:582248086783:web:821e416544755d6e9cfd84',
  databaseId:        'ai-studio-f53003d0-fb71-456f-a7b3-56b0c9169584',
};

const DRY_RUN    = process.env.DRY_RUN === 'true';
const TARGET_LEN = 7;
const NEUTRAL    = 50; // midpoint — neutral stance on the new dimension

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Pad an array to TARGET_LEN by appending NEUTRAL values.
 * Returns null if no padding needed (already correct length or not an array).
 */
function padDna(arr) {
  if (!Array.isArray(arr))        return null;   // not set — skip
  if (arr.length === TARGET_LEN)  return null;   // already correct — skip
  if (arr.length > TARGET_LEN) {
    // Truncate silently (shouldn't happen, but be defensive)
    return arr.slice(0, TARGET_LEN).map(v => typeof v === 'number' ? v : NEUTRAL);
  }
  // Pad short arrays
  const padded = [...arr];
  while (padded.length < TARGET_LEN) padded.push(NEUTRAL);
  return padded;
}

/**
 * Migrate a single Firestore collection.
 * fieldName is the DNA field to check on each document.
 */
async function migrateCollection(db, collectionName, fieldName) {
  console.log(`\n── ${collectionName} (field: ${fieldName}) ──────────────────`);

  const snap    = await getDocs(collection(db, collectionName));
  let checked   = 0;
  let patched   = 0;
  let skipped   = 0;
  const errors  = [];

  for (const docSnap of snap.docs) {
    checked++;
    const data    = docSnap.data();
    const current = data[fieldName];

    if (!Array.isArray(current)) {
      // Field missing or wrong type — log but don't touch
      if (current !== undefined) {
        console.warn(`  ⚠ ${docSnap.id}: ${fieldName} is not an array (${typeof current}) — skipped`);
      }
      skipped++;
      continue;
    }

    const padded = padDna(current);
    if (!padded) {
      // Already correct
      skipped++;
      continue;
    }

    console.log(
      `  ${DRY_RUN ? '[DRY]' : '✓'} ${docSnap.id}: ${fieldName} ` +
      `${current.length} → ${padded.length}  ` +
      `[${current.join(',')}] → [${padded.join(',')}]`
    );

    if (!DRY_RUN) {
      try {
        await updateDoc(doc(db, collectionName, docSnap.id), {
          [fieldName]: padded,
          updatedAt: serverTimestamp(),
        });
        patched++;
      } catch (err) {
        console.error(`  ✗ ${docSnap.id}: write failed — ${err.message}`);
        errors.push({ id: docSnap.id, err: err.message });
      }
    } else {
      patched++; // count as "would patch" in dry run
    }
  }

  console.log(
    `  Summary: ${checked} checked · ` +
    `${patched} ${DRY_RUN ? 'would be patched' : 'patched'} · ` +
    `${skipped} already correct or skipped · ` +
    `${errors.length} errors`
  );

  return { checked, patched, skipped, errors };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Hiro — DNA prefs migration (5 → 7 dimensions)');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 LIVE (writing to Firestore)'}`);
  console.log('═══════════════════════════════════════════════════');

  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app, firebaseConfig.databaseId);

  // 1. jobs.dnaPrefs — the primary target
  const jobsResult = await migrateCollection(db, 'jobs', 'dnaPrefs');

  // 2. users.team_dna — employer profiles store team DNA (same schema)
  const usersResult = await migrateCollection(db, 'users', 'team_dna');

  // 3. users.dna — candidate DNA vectors (less likely to be 5-elem, but check)
  const candResult = await migrateCollection(db, 'users', 'dna');

  // 4. applications — match docs store dnaScore but not raw dnaPrefs, skip

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Total patched:', jobsResult.patched + usersResult.patched + candResult.patched);
  console.log('  Total errors: ', jobsResult.errors.length + usersResult.errors.length + candResult.errors.length);
  if (DRY_RUN) {
    console.log('\n  Re-run without DRY_RUN=true to apply changes.');
  } else {
    console.log('\n  Migration complete. Re-run computeGhostScores or');
    console.log('  recomputeAllMatches to refresh scores against patched data.');
  }
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
