import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ScanResult, ErrorType } from '../types';

interface ScanContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  scanResult: ScanResult | null;
  setScanResult: (result: ScanResult | null) => void;
  scanError: ErrorType | null;
  setScanError: (error: ErrorType | null) => void;
  scanCount: number;
  incrementScanCount: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider = ({ children }: { children: ReactNode }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ErrorType | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const incrementScanCount = () => setScanCount((c) => c + 1);
  const reset = () => {
    setImageUri(null);
    setScanResult(null);
    setScanError(null);
    setIsLoading(false);
  };

  return (
    <ScanContext.Provider
      value={{
        imageUri, setImageUri,
        scanResult, setScanResult,
        scanError, setScanError,
        scanCount, incrementScanCount,
        isLoading, setIsLoading,
        reset,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) throw new Error('useScan must be used within ScanProvider');
  return context;
};
