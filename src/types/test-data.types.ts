export interface CreatedResource {
  type: string;
  id: string;
  name?: string;
  deleteVia: 'ui' | 'api';
  deletePath?: string;
  deleteMethod?: 'DELETE' | 'POST';
  project: string;
  createdAt: Date;
}

export interface TestDataFactory<T> {
  generate: () => T;
  generateMany: (count: number) => T[];
}

export interface UserTestData {
  email: string;
  password: string;
  name: string;
}

export interface DeckTestData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface CardTestData {
  type: string;
  front: string;
  back: string;
  deckId?: string;
}
