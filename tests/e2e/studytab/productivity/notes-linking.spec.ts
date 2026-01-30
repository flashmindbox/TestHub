import { test, expect } from '../../../../src/fixtures';

test.describe('Notes Linking @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  test.describe('Link to Deck', () => {
    test('should create note with deckId', async ({ request, cleanup, projectConfig }) => {
      // Create a deck first
      const deckRes = await request.post(`${projectConfig.apiUrl}/api/v1/decks`, {
        data: { name: `test-deck-${Date.now()}` },
      });
      expect(deckRes.ok()).toBeTruthy();
      const deckBody = await deckRes.json();
      const deck = deckBody.data;

      cleanup.track({
        type: 'deck',
        id: deck.id,
        name: deck.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/decks/${deck.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create note linked to deck
      const noteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: {
          title: `test-note-${Date.now()}`,
          content: 'Test content',
          deckId: deck.id,
        },
      });
      expect(noteRes.ok()).toBeTruthy();
      const noteBody = await noteRes.json();
      const note = noteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: note.id,
        name: note.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      expect(note.deckId).toBe(deck.id);
      expect(note.deck).toBeDefined();
      expect(note.deck.name).toBe(deck.name);
    });

    test('should filter notes by deckId', async ({ request, cleanup, projectConfig }) => {
      // Create deck
      const deckRes = await request.post(`${projectConfig.apiUrl}/api/v1/decks`, {
        data: { name: `test-deck-${Date.now()}` },
      });
      expect(deckRes.ok()).toBeTruthy();
      const deckBody = await deckRes.json();
      const deck = deckBody.data;

      cleanup.track({
        type: 'deck',
        id: deck.id,
        name: deck.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/decks/${deck.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create linked note
      const linkedNoteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: { title: `linked-note-${Date.now()}`, deckId: deck.id },
      });
      expect(linkedNoteRes.ok()).toBeTruthy();
      const linkedNoteBody = await linkedNoteRes.json();
      const linkedNote = linkedNoteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: linkedNote.id,
        name: linkedNote.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${linkedNote.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create unlinked note
      const unlinkedNoteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: { title: `unlinked-note-${Date.now()}` },
      });
      expect(unlinkedNoteRes.ok()).toBeTruthy();
      const unlinkedNoteBody = await unlinkedNoteRes.json();
      const unlinkedNote = unlinkedNoteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: unlinkedNote.id,
        name: unlinkedNote.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${unlinkedNote.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Filter by deckId
      const filteredRes = await request.get(
        `${projectConfig.apiUrl}/api/v1/quick-notes?deckId=${deck.id}`
      );
      expect(filteredRes.ok()).toBeTruthy();
      const filteredBody = await filteredRes.json();

      // Find our linked note in results
      const foundNote = filteredBody.data.notes.find((n: { id: string }) => n.id === linkedNote.id);
      expect(foundNote).toBeDefined();
    });
  });

  test.describe('Link to Topic', () => {
    test('should create note with topicId', async ({ request, cleanup, projectConfig }) => {
      // Create topic
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: { name: `test-topic-${Date.now()}`, type: 'CHAPTER' },
      });
      expect(topicRes.ok()).toBeTruthy();
      const topicBody = await topicRes.json();
      const topic = topicBody.data.topic;

      cleanup.track({
        type: 'topic',
        id: topic.id,
        name: topic.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/topics/${topic.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create note linked to topic
      const noteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: {
          title: `test-note-${Date.now()}`,
          topicId: topic.id,
        },
      });
      expect(noteRes.ok()).toBeTruthy();
      const noteBody = await noteRes.json();
      const note = noteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: note.id,
        name: note.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      expect(note.topicId).toBe(topic.id);
      expect(note.topic).toBeDefined();
      expect(note.topic.name).toBe(topic.name);
    });

    test('should filter notes by topicId', async ({ request, cleanup, projectConfig }) => {
      // Create topic
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: { name: `test-topic-${Date.now()}`, type: 'LECTURE' },
      });
      expect(topicRes.ok()).toBeTruthy();
      const topicBody = await topicRes.json();
      const topic = topicBody.data.topic;

      cleanup.track({
        type: 'topic',
        id: topic.id,
        name: topic.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/topics/${topic.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create linked note
      const linkedNoteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: { title: `linked-note-${Date.now()}`, topicId: topic.id },
      });
      expect(linkedNoteRes.ok()).toBeTruthy();
      const linkedNoteBody = await linkedNoteRes.json();
      const linkedNote = linkedNoteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: linkedNote.id,
        name: linkedNote.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${linkedNote.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Filter by topicId
      const filteredRes = await request.get(
        `${projectConfig.apiUrl}/api/v1/quick-notes?topicId=${topic.id}`
      );
      expect(filteredRes.ok()).toBeTruthy();
      const filteredBody = await filteredRes.json();

      const foundNote = filteredBody.data.notes.find((n: { id: string }) => n.id === linkedNote.id);
      expect(foundNote).toBeDefined();
    });
  });

  test.describe('Update Links', () => {
    test('should update note to add deckId', async ({ request, cleanup, projectConfig }) => {
      // Create deck
      const deckRes = await request.post(`${projectConfig.apiUrl}/api/v1/decks`, {
        data: { name: `test-deck-${Date.now()}` },
      });
      expect(deckRes.ok()).toBeTruthy();
      const deckBody = await deckRes.json();
      const deck = deckBody.data;

      cleanup.track({
        type: 'deck',
        id: deck.id,
        name: deck.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/decks/${deck.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Create note without link
      const noteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: { title: `test-note-${Date.now()}` },
      });
      expect(noteRes.ok()).toBeTruthy();
      const noteBody = await noteRes.json();
      const note = noteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: note.id,
        name: note.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      expect(note.deckId).toBeNull();

      // Update to link deck
      const updateRes = await request.put(`${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`, {
        data: { deckId: deck.id },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updateBody = await updateRes.json();
      const updated = updateBody.data.note;

      expect(updated.deckId).toBe(deck.id);
      expect(updated.deck.name).toBe(deck.name);
    });

    test('should unlink note from deck', async ({ request, cleanup, projectConfig }) => {
      // Create deck and linked note
      const deckRes = await request.post(`${projectConfig.apiUrl}/api/v1/decks`, {
        data: { name: `test-deck-${Date.now()}` },
      });
      expect(deckRes.ok()).toBeTruthy();
      const deckBody = await deckRes.json();
      const deck = deckBody.data;

      cleanup.track({
        type: 'deck',
        id: deck.id,
        name: deck.name,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/decks/${deck.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      const noteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
        data: { title: `test-note-${Date.now()}`, deckId: deck.id },
      });
      expect(noteRes.ok()).toBeTruthy();
      const noteBody = await noteRes.json();
      const note = noteBody.data.note;

      cleanup.track({
        type: 'quick-note',
        id: note.id,
        name: note.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Unlink by setting deckId to null
      const updateRes = await request.put(`${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`, {
        data: { deckId: null },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updateBody = await updateRes.json();
      const updated = updateBody.data.note;

      expect(updated.deckId).toBeNull();
      expect(updated.deck).toBeNull();
    });
  });
});
