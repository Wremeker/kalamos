import { initDatabase, closeDatabase } from '../db/sequelize';
import { Document } from '../models/Document';

const sampleContent = {
  blocks: [
    { id: 'b1', type: 'h1', text: 'Welcome to the Block Editor' },
    {
      id: 'b2',
      type: 'paragraph',
      text: 'This is a sample document seeded by the reference server. Edit it in the demo app.',
    },
    { id: 'b3', type: 'h2', text: 'Try these' },
    { id: 'b4', type: 'bulleted', text: 'Type <b>/</b> to open the slash menu' },
    { id: 'b5', type: 'bulleted', text: 'Drag blocks to reorder them' },
    { id: 'b6', type: 'todo', text: 'Check off a task', checked: false },
    { id: 'b7', type: 'quote', text: 'Content is stored as JSON { blocks }.' },
  ],
};

async function main(): Promise<void> {
  await initDatabase();
  const existing = await Document.count();
  if (existing > 0) {
    // eslint-disable-next-line no-console
    console.log(`Skipping seed: ${existing} document(s) already exist.`);
  } else {
    const doc = await Document.create({
      title: 'Getting Started',
      content: sampleContent,
    } as Partial<Document> as Document);
    // eslint-disable-next-line no-console
    console.log(`Seeded document ${doc.id}`);
  }
  await closeDatabase();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
