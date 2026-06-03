import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalTermsModalProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const LegalTermsModal = ({ open, onAccept, onCancel }: LegalTermsModalProps) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Responsible Reporting Agreement</DialogTitle>
          <DialogDescription>
            Please read and accept the terms before creating your account.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              By using this platform you agree that all incident reports submitted are truthful and made in good faith.
            </p>
            <p>
              Submitting false reports, misleading information, or intentionally misusing the emergency reporting system may result in legal consequences under applicable laws including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IPC Section 182 – False information to a public servant</li>
              <li>IPC Section 177 – Furnishing false information</li>
              <li>IPC Section 211 – False charge of offense</li>
              <li>IT Act Section 66 – Misuse of digital systems</li>
            </ul>
            <p>
              Users found intentionally submitting fake or misleading reports may face account suspension, penalties, or legal prosecution.
            </p>
          </div>
        </ScrollArea>
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms-agree"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <label htmlFor="terms-agree" className="text-sm leading-snug cursor-pointer">
            I confirm that all reports I submit will be truthful and I agree to the Responsible Reporting Terms.
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="hero" disabled={!agreed} onClick={onAccept}>
            Accept & Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalTermsModal;
