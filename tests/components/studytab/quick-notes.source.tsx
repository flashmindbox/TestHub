/**
 * Mock QuickNotes component for Playwright CT testing.
 *
 * Mirrors the real QuickNotes from StudyTab's notes feature
 * without external dependencies (no zustand, no API hooks).
 */

import React, { useState, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  isPinned: boolean;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
}

interface QuickNotesProps {
  folders: Folder[];
  notes: Note[];
  onNoteCreate?: () => void;
  onNoteUpdate?: (note: Note) => void;
  onPinToggle?: (noteId: string) => void;
  onColorChange?: (noteId: string, color: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#fef3c7', label: 'Yellow' },
  { value: '#dbeafe', label: 'Blue' },
  { value: '#dcfce7', label: 'Green' },
  { value: '#fce7f3', label: 'Pink' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function QuickNotes({
  folders,
  notes,
  onNoteCreate,
  onNoteUpdate,
  onPinToggle,
  onColorChange,
}: QuickNotesProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedFolderId) {
      result = result.filter((n) => n.folderId === selectedFolderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => n.title.toLowerCase().includes(q));
    }

    // Pinned notes first
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [notes, selectedFolderId, searchQuery]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  return (
    <div className="flex h-full border rounded-lg overflow-hidden" data-testid="quick-notes">
      {/* Column 1: Folders */}
      <div
        className="w-48 border-r bg-muted/30 flex flex-col"
        data-testid="folders-panel"
      >
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Folders</h3>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <button
            className={`w-full text-left px-3 py-1.5 text-sm rounded ${
              selectedFolderId === null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedFolderId(null)}
            data-testid="folder-all"
          >
            All Notes
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              className={`w-full text-left px-3 py-1.5 text-sm rounded ${
                selectedFolderId === folder.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setSelectedFolderId(folder.id)}
              data-testid={`folder-${folder.id}`}
            >
              {folder.name}
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Note list */}
      <div
        className="w-64 border-r flex flex-col"
        data-testid="notes-list-panel"
      >
        <div className="p-3 border-b flex items-center gap-2">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border rounded"
            data-testid="search-input"
          />
          <button
            onClick={() => onNoteCreate?.()}
            className="p-1.5 rounded bg-primary text-primary-foreground text-sm"
            aria-label="New note"
            data-testid="new-note-btn"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {filteredNotes.length === 0 ? (
            <div
              className="p-4 text-center text-sm text-muted-foreground"
              data-testid="no-notes-message"
            >
              No notes
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                className={`w-full text-left px-3 py-2 border-b text-sm ${
                  selectedNoteId === note.id ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedNoteId(note.id)}
                data-testid={`note-item-${note.id}`}
              >
                <div className="flex items-center gap-1">
                  {note.isPinned && (
                    <span className="text-xs" data-testid={`pin-indicator-${note.id}`}>
                      📌
                    </span>
                  )}
                  <span
                    className="truncate font-medium"
                    data-testid={`note-title-${note.id}`}
                  >
                    {note.title}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Column 3: Editor */}
      <div
        className="flex-1 flex flex-col"
        data-testid="editor-panel"
      >
        {selectedNote ? (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <h3
                className="font-semibold"
                data-testid="editor-title"
              >
                {selectedNote.title}
              </h3>
              <div className="flex items-center gap-2">
                {/* Pin toggle */}
                <button
                  onClick={() => onPinToggle?.(selectedNote.id)}
                  className={`p-1.5 rounded text-sm ${
                    selectedNote.isPinned
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={selectedNote.isPinned ? 'Unpin note' : 'Pin note'}
                  data-testid="pin-toggle"
                >
                  {selectedNote.isPinned ? '📌' : '📍'}
                </button>

                {/* Color picker */}
                <div className="flex gap-1" data-testid="color-picker">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      className={`rounded-full ${
                        selectedNote.color === c.value
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value, width: 24, height: 24, border: selectedNote.color === c.value ? '2px solid #3b82f6' : '2px solid transparent' }}
                      onClick={() => onColorChange?.(selectedNote.id, c.value)}
                      aria-label={c.label}
                      data-testid={`color-${c.label.toLowerCase()}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div
                className="text-sm whitespace-pre-wrap"
                data-testid="editor-content"
              >
                {selectedNote.content}
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex-1 flex items-center justify-center text-sm text-muted-foreground"
            data-testid="editor-empty"
          >
            Select a note to view
          </div>
        )}
      </div>
    </div>
  );
}
