import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackFormProps {
  suggestedCode: string;
  onSubmitted: () => void;
}

const FeedbackForm = ({ suggestedCode, onSubmitted }: FeedbackFormProps) => {
  const [correctCode, setCorrectCode] = useState("");
  const [additionalFeedback, setAdditionalFeedback] = useState("");

  const submit = async () => {
    await supabase.from("coding_feedback").insert({
      clinical_input_preview: "",
      suggested_code: suggestedCode,
      feedback_type: "negative",
      correct_code: correctCode || null,
      additional_feedback: additionalFeedback || null,
    });
    setCorrectCode("");
    setAdditionalFeedback("");
    onSubmitted();
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
      <Input
        placeholder="What is the correct code? (e.g., 27446)"
        value={correctCode}
        onChange={(e) => setCorrectCode(e.target.value)}
        className="text-sm"
      />
      <Textarea
        placeholder="Additional feedback (optional)"
        value={additionalFeedback}
        onChange={(e) => setAdditionalFeedback(e.target.value)}
        className="min-h-[60px] text-sm"
      />
      <Button size="sm" variant="outline" onClick={submit}>
        Submit Feedback
      </Button>
    </div>
  );
};

export default FeedbackForm;
