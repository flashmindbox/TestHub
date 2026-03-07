/**
 * QuickNotes Component Tests
 *
 * Tests for the StudyTab quick notes including three-column layout,
 * folder filtering, note selection, pin toggle, search, and color picker.
 *
 * @module tests/components/studytab/quick-notes
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { QuickNotes, type Note, type Folder } from './quick-notes.source';

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

const FOLDERS: Folder[] = [
  { id: 'folder-1', name: 'Study Notes' },
  { id: 'folder-2', name: 'Research' },
  { id: 'folder-3', name: 'Personal' },
];

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'Untitled Note',
    content: 'Some content here.',
    folderId: 'folder-1',
    isPinned: false,
    color: '#ffffff',
    ...overrides,
  };
}

function createNoteSet(): Note[] {
  return [
    createNote({ id: 'note-1', title: 'React Hooks', content: 'useState, useEffect, useMemo...', folderId: 'folder-1', isPinned: true }),
    createNote({ id: 'note-2', title: 'TypeScript Tips', content: 'Generics, mapped types...', folderId: 'folder-1' }),
    createNote({ id: 'note-3', title: 'Paper Summary', content: 'Key findings from the paper...', folderId: 'folder-2' }),
    createNote({ id: 'note-4', title: 'Meeting Notes', content: 'Action items from standup...', folderId: 'folder-2', isPinned: true }),
    createNote({ id: 'note-5', title: 'Grocery List', content: 'Milk, eggs, bread...', folderId: 'folder-3' }),
  ];
}

// =============================================================================
// LAYOUT TESTS
// =============================================================================

test.describe('QuickNotes - Layout', () => {
  test('renders three-column layout (folders, note list, editor)', async ({ mount }) => {
    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={createNoteSet()} />
    );

    await expect(component.getByTestId('folders-panel')).toBeVisible();
    await expect(component.getByTestId('notes-list-panel')).toBeVisible();
    await expect(component.getByTestId('editor-panel')).toBeVisible();
  });

  test('folder list shows folder names', async ({ mount }) => {
    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={[]} />
    );

    await expect(component.getByTestId('folder-folder-1')).toContainText('Study Notes');
    await expect(component.getByTestId('folder-folder-2')).toContainText('Research');
    await expect(component.getByTestId('folder-folder-3')).toContainText('Personal');
  });
});

// =============================================================================
// FOLDER FILTERING TESTS
// =============================================================================

test.describe('QuickNotes - Folder Filtering', () => {
  test('clicking folder filters notes in list', async ({ mount }) => {
    const notes = createNoteSet();

    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={notes} />
    );

    // Initially all 5 notes visible
    await expect(component.getByTestId('note-item-note-1')).toBeVisible();
    await expect(component.getByTestId('note-item-note-5')).toBeVisible();

    // Click "Research" folder
    await component.getByTestId('folder-folder-2').click();

    // Only Research notes visible (note-3 and note-4)
    await expect(component.getByTestId('note-item-note-3')).toBeVisible();
    await expect(component.getByTestId('note-item-note-4')).toBeVisible();

    // Study Notes should be hidden
    await expect(component.getByTestId('note-item-note-1')).not.toBeVisible();
    await expect(component.getByTestId('note-item-note-2')).not.toBeVisible();
  });

  test('empty folder shows "No notes" message', async ({ mount }) => {
    const notes = createNoteSet();

    const component = await mount(
      <QuickNotes
        folders={[...FOLDERS, { id: 'folder-empty', name: 'Empty Folder' }]}
        notes={notes}
      />
    );

    // Click the empty folder
    await component.getByTestId('folder-folder-empty').click();

    await expect(component.getByTestId('no-notes-message')).toContainText('No notes');
  });
});

// =============================================================================
// NOTE SELECTION TESTS
// =============================================================================

test.describe('QuickNotes - Note Selection', () => {
  test('note list shows note titles', async ({ mount }) => {
    const notes = createNoteSet();

    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={notes} />
    );

    await expect(component.getByTestId('note-title-note-1')).toContainText('React Hooks');
    await expect(component.getByTestId('note-title-note-3')).toContainText('Paper Summary');
  });

  test('clicking note shows content in editor', async ({ mount }) => {
    const notes = createNoteSet();

    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={notes} />
    );

    // Initially no note selected
    await expect(component.getByTestId('editor-empty')).toContainText('Select a note');

    // Click a note
    await component.getByTestId('note-item-note-1').click();

    await expect(component.getByTestId('editor-title')).toContainText('React Hooks');
    await expect(component.getByTestId('editor-content')).toContainText('useState, useEffect, useMemo');
  });
});

// =============================================================================
// ACTION TESTS
// =============================================================================

test.describe('QuickNotes - Actions', () => {
  test('new note button creates empty note', async ({ mount }) => {
    let createCalled = false;

    const component = await mount(
      <QuickNotes
        folders={FOLDERS}
        notes={[]}
        onNoteCreate={() => (createCalled = true)}
      />
    );

    await component.getByTestId('new-note-btn').click();

    expect(createCalled).toBe(true);
  });

  test('pin button toggles pin state', async ({ mount }) => {
    const notes = createNoteSet();
    let pinnedNoteId: string | null = null;

    const component = await mount(
      <QuickNotes
        folders={FOLDERS}
        notes={notes}
        onPinToggle={(id) => (pinnedNoteId = id)}
      />
    );

    // Select a note first
    await component.getByTestId('note-item-note-1').click();

    // Click pin toggle
    await component.getByTestId('pin-toggle').click();

    expect(pinnedNoteId).toBe('note-1');
  });

  test('search input filters notes by title', async ({ mount }) => {
    const notes = createNoteSet();

    const component = await mount(
      <QuickNotes folders={FOLDERS} notes={notes} />
    );

    // Type in search
    await component.getByTestId('search-input').fill('React');

    // Only "React Hooks" should remain
    await expect(component.getByTestId('note-item-note-1')).toBeVisible();
    await expect(component.getByTestId('note-item-note-2')).not.toBeVisible();
    await expect(component.getByTestId('note-item-note-3')).not.toBeVisible();
  });

  test('color picker changes note color', async ({ mount }) => {
    const notes = [createNote({ id: 'note-color', title: 'Colorful', color: '#ffffff' })];
    let changedColor: string | null = null;

    const component = await mount(
      <QuickNotes
        folders={FOLDERS}
        notes={notes}
        onColorChange={(id, color) => (changedColor = color)}
      />
    );

    // Select the note
    await component.getByTestId('note-item-note-color').click();

    // Pick yellow color
    await component.getByTestId('color-yellow').click();

    expect(changedColor).toBe('#fef3c7');
  });
});
