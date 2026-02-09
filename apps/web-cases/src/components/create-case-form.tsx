'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCase } from '@/hooks/use-cases';
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card } from '@upllyft/ui';
import { useToast } from '@upllyft/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function CreateCaseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createCase = useCreateCase();

  const [childId, setChildId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!childId.trim()) {
      toast({ title: 'Child ID is required', variant: 'destructive' });
      return;
    }

    try {
      const result = await createCase.mutateAsync({
        childId: childId.trim(),
        diagnosis: diagnosis.trim() || undefined,
        referralSource: referralSource.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Case created successfully' });
      router.push(`/${result.id}`);
    } catch {
      toast({ title: 'Failed to create case', variant: 'destructive' });
    }
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cases
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Case</h1>
      <p className="text-gray-500 mb-6">Open a new clinical case for a patient</p>

      <Card className="p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="childId">Child / Patient ID *</Label>
            <Input
              id="childId"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              placeholder="Enter the child's ID"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Primary diagnosis or presenting concerns"
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="referralSource">Referral Source</Label>
            <Select value={referralSource} onValueChange={setReferralSource}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select referral source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELF">Self-referral</SelectItem>
                <SelectItem value="PHYSICIAN">Physician</SelectItem>
                <SelectItem value="SCHOOL">School</SelectItem>
                <SelectItem value="SPECIALIST">Specialist</SelectItem>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Initial Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any initial notes or observations"
              className="mt-1.5"
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={createCase.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Case
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
