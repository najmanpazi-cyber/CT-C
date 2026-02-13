import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import ClinicalInput from "@/components/ClinicalInput";
import ResultsPanel from "@/components/ResultsPanel";
import type { CodingRequest, CodingResult, CodingError } from "@/types/coding";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [result, setResult] = useState<CodingResult | null>(null);
  const [error, setError] = useState<CodingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastClinicalInput, setLastClinicalInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  const handleSubmit = useCallback(async (request: CodingRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLastClinicalInput(request.clinical_input);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-codes', {
        body: {
          clinical_input: request.clinical_input,
          laterality: request.laterality,
          patient_type: request.patient_type,
          setting: request.setting,
          time_spent: request.time_spent,
        },
      });

      if (fnError || data?.error) {
        setError({
          error: true,
          error_code: data?.error_code || "UNKNOWN",
          error_message: data?.error_message || fnError?.message || "Unknown error",
          user_message: data?.user_message || "Something went wrong. Please try again.",
        });
      } else {
        setResult(data as CodingResult);
      }
    } catch (err: any) {
      setError({
        error: true,
        error_code: "NETWORK_ERROR",
        error_message: err?.message || "Network error",
        user_message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
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
            sessionId={sessionId.current}
            clinicalInputPreview={lastClinicalInput.substring(0, 100)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
