import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import ClinicalInput from "@/components/ClinicalInput";
import ResultsPanel from "@/components/ResultsPanel";
import type { CodingRequest, CodingResult, CodingError } from "@/types/coding";
import { MOCK_RESULT } from "@/components/results/mockData";

const Index = () => {
  const [result, setResult] = useState<CodingResult | null>(null);
  const [error, setError] = useState<CodingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async (_request: CodingRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Temporary: simulate 3s loading then show mock data
    setTimeout(() => {
      setResult(MOCK_RESULT);
      setIsLoading(false);
    }, 3000);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="w-full border-b lg:w-2/5 lg:border-b-0 lg:border-r">
          <ClinicalInput onSubmit={handleSubmit} isLoading={isLoading} textareaRef={textareaRef} />
        </div>
        <div className="flex-1 bg-secondary/30">
          <ResultsPanel
            result={result}
            error={error}
            isLoading={isLoading}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
