export interface GeminiGradingResult {
  cardName: string;
  setName: string;
  setNumber: string;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  overallTier: string;
  estimatedPSA: string;
  explanation: string;
}

export interface PriceData {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
}

export interface ScanResult {
  grading: GeminiGradingResult;
  price: PriceData | null;
  pokemonTcgId: string | null;
  imageUrl: string;
  storagePath: string;
  cardArtworkUrl: string | null;
}

export interface SavedCard extends ScanResult {
  id: string;
  scannedAt: Date;
}

export type ErrorType =
  | 'blurry_image'
  | 'not_pokemon_card'
  | 'network_error'
  | 'camera_permission_denied'
  | 'quota_exceeded'
  | 'card_not_found'
  | 'unknown';
