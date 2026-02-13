import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { CodingRequest } from "@/types/coding";

interface ClinicalInputProps {
  onSubmit: (request: CodingRequest) => void;
  isLoading: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

const ClinicalInput = ({ onSubmit, isLoading, textareaRef }: ClinicalInputProps) => {
  const [clinicalInput, setClinicalInput] = useState("");
  const [laterality, setLaterality] = useState("Not specified");
  const [patientType, setPatientType] = useState("Not specified");
  const [setting, setSetting] = useState("Office/Outpatient");
  const [timeSpent, setTimeSpent] = useState("Not specified");
  const [cooldown, setCooldown] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!clinicalInput.trim() || isLoading || cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
    onSubmit({
      clinical_input: clinicalInput,
      laterality,
      patient_type: patientType,
      setting,
      time_spent: timeSpent,
    });
  }, [clinicalInput, laterality, patientType, setting, timeSpent, isLoading, cooldown, onSubmit]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Clinical Documentation
        </label>
        <Textarea
          ref={textareaRef}
          placeholder="Paste operative notes, encounter documentation, or describe the procedure performed..."
          value={clinicalInput}
          onChange={(e) => setClinicalInput(e.target.value)}
          className="min-h-[200px] resize-y text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Laterality</label>
          <Select value={laterality} onValueChange={setLaterality}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Left", "Right", "Bilateral", "Not specified"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Patient Type</label>
          <Select value={patientType} onValueChange={setPatientType}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["New", "Established", "Not specified"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Setting</label>
          <Select value={setting} onValueChange={setSetting}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Office/Outpatient", "Outpatient Surgery Center", "Inpatient Hospital", "Emergency Department"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Time Spent (E/M)</label>
          <Select value={timeSpent} onValueChange={setTimeSpent}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Not specified", "10-19 min", "20-29 min", "30-39 min", "40-54 min", "55+ min"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!clinicalInput.trim() || isLoading || cooldown}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          "Analyze Documentation"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        This tool provides coding suggestions only. All codes must be verified by qualified personnel before claim submission.
      </p>
    </div>
  );
};

export default ClinicalInput;
