import { useState, useCallback } from "react";
import Header from "@/components/Header";
import ClinicalInput from "@/components/ClinicalInput";
import ResultsPanel from "@/components/ResultsPanel";
import type { CodingRequest, CodingResult, CodingError } from "@/types/coding";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [result, setResult] = useState<CodingResult | null>(null);
  const [error, setError] = useState<CodingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (request: CodingRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-codes", {
        body: request,
      });

      if (fnError) {
        setError({
          error: true,
          error_code: "INTERNAL_ERROR",
          error_message: fnError.message,
          user_message: "Something went wrong. Please try again.",
        });
      } else if (data?.error) {
        setError(data as CodingError);
      } else {
        setResult(data as CodingResult);
      }
    } catch {
      setError({
        error: true,
        error_code: "INTERNAL_ERROR",
        error_message: "Network error",
        user_message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="w-full border-b lg:w-2/5 lg:border-b-0 lg:border-r">
          <ClinicalInput onSubmit={handleSubmit} isLoading={isLoading} />
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
