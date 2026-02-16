'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@upllyft/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  addChild,
  updateChild,
  addChildCondition,
  updateChildCondition,
  deleteChildCondition,
  type Child,
  type ChildCondition,
} from '@/lib/api/profiles';
import {
  GENDER_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  DIAGNOSIS_STATUS_OPTIONS,
  CONDITION_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  THERAPY_TYPE_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  ATTENDANCE_PATTERN_OPTIONS,
  BIRTH_ORDER_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from '@/lib/constants/child-form';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepId = 'basic' | 'education' | 'birth' | 'health' | 'conditions';

const ALL_STEPS: { id: StepId; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'education', label: 'Education' },
  { id: 'birth', label: 'Birth & Medical' },
  { id: 'health', label: 'Current Health' },
  { id: 'conditions', label: 'Diagnosis' },
];

export interface ChildFormWizardProps {
  /** 'add' for new child, 'edit' for updating existing */
  mode: 'add' | 'edit';
  /** Required for edit mode — the child being edited */
  childId?: string;
  /** The child object used to pre-populate fields (edit) and show conditions */
  child?: Child;
}

// ---------------------------------------------------------------------------
// Shared CSS classes
// ---------------------------------------------------------------------------

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors';
const textareaClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors min-h-[100px] resize-y';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChildFormWizard({ mode, childId, child }: ChildFormWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<StepId>('basic');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(mode === 'add');
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);

  // ---- Basic info ----
  const [firstName, setFirstName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [birthOrder, setBirthOrder] = useState('');
  const [nationality, setNationality] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  const [hasCondition, setHasCondition] = useState(false);

  // ---- Education ----
  const [currentSchool, setCurrentSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [mediumOfInstruction, setMediumOfInstruction] = useState('');
  const [attendancePattern, setAttendancePattern] = useState('');
  const [teacherConcerns, setTeacherConcerns] = useState('');
  const [learningDifficulties, setLearningDifficulties] = useState('');

  // ---- Birth & medical ----
  const [mothersHealthDuringPregnancy, setMothersHealthDuringPregnancy] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [prematureBirth, setPrematureBirth] = useState(false);
  const [gestationalAge, setGestationalAge] = useState('');
  const [birthWeight, setBirthWeight] = useState('');
  const [birthComplications, setBirthComplications] = useState('');
  const [delayedMilestones, setDelayedMilestones] = useState(false);
  const [delayedMilestonesDetails, setDelayedMilestonesDetails] = useState('');

  // ---- Current health ----
  const [currentMedicalConditions, setCurrentMedicalConditions] = useState('');
  const [visionHearingIssues, setVisionHearingIssues] = useState('');
  const [takingMedications, setTakingMedications] = useState(false);
  const [medicationDetails, setMedicationDetails] = useState('');
  const [familyHistoryOfDevelopmentalDisorders, setFamilyHistoryOfDevelopmentalDisorders] = useState('');
  const [sleepIssues, setSleepIssues] = useState(false);
  const [sleepDetails, setSleepDetails] = useState('');
  const [eatingIssues, setEatingIssues] = useState(false);
  const [eatingDetails, setEatingDetails] = useState('');
  const [developmentalConcerns, setDevelopmentalConcerns] = useState('');
  const [previousAssessments, setPreviousAssessments] = useState(false);
  const [referralSource, setReferralSource] = useState('');

  // ---- Conditions (step 5) ----
  const [diagnosisStatus, setDiagnosisStatus] = useState('');
  const [showConditionForm, setShowConditionForm] = useState(mode === 'add');
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [conditionType, setConditionType] = useState('');
  const [severity, setSeverity] = useState('');
  const [diagnosedAt, setDiagnosedAt] = useState('');
  const [diagnosedBy, setDiagnosedBy] = useState('');
  const [specificDiagnosis, setSpecificDiagnosis] = useState('');
  const [conditionTherapies, setConditionTherapies] = useState<string[]>([]);
  const [conditionMedications, setConditionMedications] = useState<string[]>([]);
  const [newMedication, setNewMedication] = useState('');
  const [primaryChallenges, setPrimaryChallenges] = useState('');
  const [strengths, setStrengths] = useState('');
  const [notes, setNotes] = useState('');

  // ---- Initialize from existing child (edit mode) ----
  useEffect(() => {
    if (child && !initialized) {
      setFirstName(child.firstName || '');
      setNickname(child.nickname || '');
      setDateOfBirth(child.dateOfBirth?.split('T')[0] || '');
      setGender(child.gender || '');
      setBirthOrder(child.birthOrder || '');
      setNationality(child.nationality || '');
      setPrimaryLanguage(child.primaryLanguage || '');
      setHasCondition(child.hasCondition);
      setCurrentSchool(child.currentSchool || '');
      setGrade(child.grade || '');
      setSchoolType(child.schoolType || '');
      setMediumOfInstruction(child.mediumOfInstruction || '');
      setAttendancePattern(child.attendancePattern || '');
      setTeacherConcerns(child.teacherConcerns || '');
      setLearningDifficulties(child.learningDifficulties || '');
      setMothersHealthDuringPregnancy(child.mothersHealthDuringPregnancy || '');
      setDeliveryType(child.deliveryType || '');
      setPrematureBirth(child.prematureBirth || false);
      setGestationalAge(child.gestationalAge || '');
      setBirthWeight(child.birthWeight || '');
      setBirthComplications(child.birthComplications || '');
      setDelayedMilestones(child.delayedMilestones || false);
      setDelayedMilestonesDetails(child.delayedMilestonesDetails || '');
      setCurrentMedicalConditions(child.currentMedicalConditions || '');
      setVisionHearingIssues(child.visionHearingIssues || '');
      setTakingMedications(child.takingMedications || false);
      setMedicationDetails(child.medicationDetails || '');
      setFamilyHistoryOfDevelopmentalDisorders(child.familyHistoryOfDevelopmentalDisorders || '');
      setSleepIssues(child.sleepIssues || false);
      setSleepDetails(child.sleepDetails || '');
      setEatingIssues(child.eatingIssues || false);
      setEatingDetails(child.eatingDetails || '');
      setDevelopmentalConcerns(child.developmentalConcerns || '');
      setPreviousAssessments(child.previousAssessments || false);
      setReferralSource(child.referralSource || '');
      setDiagnosisStatus(child.diagnosisStatus || '');
      setInitialized(true);
    }
  }, [child, initialized]);

  // ---- Step navigation ----
  const steps = hasCondition ? ALL_STEPS : [ALL_STEPS[0]];
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  function nextStep() {
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next.id);
  }

  function prevStep() {
    const prev = steps[currentIndex - 1];
    if (prev) setCurrentStep(prev.id);
  }

  // ---- Build child payload ----
  function buildChildData() {
    const data: Record<string, unknown> = { firstName, dateOfBirth, gender, hasCondition };
    if (nickname) data.nickname = nickname;
    if (birthOrder) data.birthOrder = birthOrder;
    if (nationality) data.nationality = nationality;
    if (primaryLanguage) data.primaryLanguage = primaryLanguage;

    // Only include condition-related fields when hasCondition is true (or always for edit)
    const includeAll = hasCondition || mode === 'edit';
    if (includeAll) {
      if (currentSchool) data.currentSchool = currentSchool;
      if (grade) data.grade = grade;
      if (schoolType) data.schoolType = schoolType;
      if (mediumOfInstruction) data.mediumOfInstruction = mediumOfInstruction;
      if (attendancePattern) data.attendancePattern = attendancePattern;
      if (teacherConcerns) data.teacherConcerns = teacherConcerns;
      if (learningDifficulties) data.learningDifficulties = learningDifficulties;
      if (mothersHealthDuringPregnancy) data.mothersHealthDuringPregnancy = mothersHealthDuringPregnancy;
      if (deliveryType) data.deliveryType = deliveryType;
      data.prematureBirth = prematureBirth;
      if (prematureBirth && gestationalAge) data.gestationalAge = gestationalAge;
      if (birthWeight) data.birthWeight = birthWeight;
      if (birthComplications) data.birthComplications = birthComplications;
      data.delayedMilestones = delayedMilestones;
      if (delayedMilestones && delayedMilestonesDetails) data.delayedMilestonesDetails = delayedMilestonesDetails;
      if (currentMedicalConditions) data.currentMedicalConditions = currentMedicalConditions;
      if (visionHearingIssues) data.visionHearingIssues = visionHearingIssues;
      data.takingMedications = takingMedications;
      if (takingMedications && medicationDetails) data.medicationDetails = medicationDetails;
      if (familyHistoryOfDevelopmentalDisorders) data.familyHistoryOfDevelopmentalDisorders = familyHistoryOfDevelopmentalDisorders;
      data.sleepIssues = sleepIssues;
      if (sleepIssues && sleepDetails) data.sleepDetails = sleepDetails;
      data.eatingIssues = eatingIssues;
      if (eatingIssues && eatingDetails) data.eatingDetails = eatingDetails;
      if (developmentalConcerns) data.developmentalConcerns = developmentalConcerns;
      data.previousAssessments = previousAssessments;
      if (referralSource) data.referralSource = referralSource;
      if (diagnosisStatus) data.diagnosisStatus = diagnosisStatus;
    }
    return data;
  }

  // ---- Save child ----
  async function handleSaveChild() {
    if (!firstName || !dateOfBirth || !gender) {
      toast({ title: 'Required fields', description: 'Please fill in name, date of birth, and gender', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (mode === 'add') {
        const created = await addChild(buildChildData());
        setCreatedChildId(created.id);
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        if (!hasCondition) {
          toast({ title: 'Child added', description: `${firstName} has been added to your profile` });
          router.push('/profile/edit');
        } else if (currentStep === 'health') {
          nextStep();
        }
      } else {
        await updateChild(childId!, buildChildData());
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        toast({ title: 'Child updated', description: `${firstName}'s information has been updated` });
        router.push('/profile/edit');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to save child', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ---- Condition CRUD ----
  function resetConditionForm() {
    setConditionType('');
    setSeverity('');
    setDiagnosedAt('');
    setDiagnosedBy('');
    setSpecificDiagnosis('');
    setConditionTherapies([]);
    setConditionMedications([]);
    setNewMedication('');
    setPrimaryChallenges('');
    setStrengths('');
    setNotes('');
    setEditingConditionId(null);
    if (mode === 'edit') setShowConditionForm(false);
  }

  function startEditCondition(cond: ChildCondition) {
    setEditingConditionId(cond.id);
    setConditionType(cond.conditionType || '');
    setSeverity(cond.severity || '');
    setDiagnosedAt(cond.diagnosedAt?.split('T')[0] || '');
    setDiagnosedBy(cond.diagnosedBy || '');
    setSpecificDiagnosis(cond.specificDiagnosis || '');
    setConditionTherapies(cond.currentTherapies || []);
    setConditionMedications(cond.medications || []);
    setPrimaryChallenges(cond.primaryChallenges || '');
    setStrengths(cond.strengths || '');
    setNotes(cond.notes || '');
    setShowConditionForm(true);
  }

  async function handleSaveCondition() {
    const targetChildId = mode === 'add' ? createdChildId : childId;
    if (!targetChildId || !conditionType) {
      toast({ title: 'Required', description: 'Please select a condition type', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const condData: Record<string, unknown> = { childId: targetChildId, conditionType };
      if (severity) condData.severity = severity;
      if (diagnosedAt) condData.diagnosedAt = diagnosedAt;
      if (diagnosedBy) condData.diagnosedBy = diagnosedBy;
      if (specificDiagnosis) condData.specificDiagnosis = specificDiagnosis;
      if (conditionTherapies.length > 0) condData.currentTherapies = conditionTherapies;
      if (conditionMedications.length > 0) condData.medications = conditionMedications;
      if (primaryChallenges) condData.primaryChallenges = primaryChallenges;
      if (strengths) condData.strengths = strengths;
      if (notes) condData.notes = notes;

      if (editingConditionId) {
        await updateChildCondition(editingConditionId, condData as any);
        toast({ title: 'Condition updated' });
      } else {
        await addChildCondition(condData as any);
        toast({ title: mode === 'add' ? 'Child added' : 'Condition added', description: mode === 'add' ? `${firstName} and condition details have been saved` : undefined });
      }
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      if (mode === 'add') {
        router.push('/profile/edit');
      } else {
        resetConditionForm();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to save condition', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCondition(condId: string) {
    if (!confirm('Remove this condition?')) return;
    try {
      await deleteChildCondition(condId);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Condition removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to remove condition', variant: 'destructive' });
    }
  }

  function toggleTherapy(therapy: string) {
    setConditionTherapies((prev) =>
      prev.includes(therapy) ? prev.filter((t) => t !== therapy) : [...prev, therapy],
    );
  }

  function addMedicationItem() {
    const trimmed = newMedication.trim();
    if (trimmed && !conditionMedications.includes(trimmed)) {
      setConditionMedications((prev) => [...prev, trimmed]);
      setNewMedication('');
    }
  }

  function removeMedication(med: string) {
    setConditionMedications((prev) => prev.filter((m) => m !== med));
  }

  // ---- Primary action per step ----
  async function handleNext() {
    if (mode === 'add') {
      if (currentStep === 'basic' && !hasCondition) {
        await handleSaveChild();
      } else if (currentStep === 'health') {
        await handleSaveChild();
      } else if (currentStep === 'conditions') {
        if (conditionType) {
          await handleSaveCondition();
        } else {
          toast({ title: 'Child added', description: `${firstName} has been added to your profile` });
          router.push('/profile/edit');
        }
      } else {
        nextStep();
      }
    } else {
      if (currentStep === 'basic' && !hasCondition) {
        await handleSaveChild();
      } else if (currentStep === 'conditions') {
        await handleSaveChild();
      } else {
        nextStep();
      }
    }
  }

  // ---- Derived ----
  const existingConditions = child?.conditions || [];
  const isAdd = mode === 'add';
  const pageTitle = isAdd ? 'Add Child' : `Edit Child \u2014 ${child?.firstName || ''}`;
  const pageSubtitle = isAdd
    ? "Fill in your child\u2019s details for personalized support"
    : "Update your child\u2019s details and conditions";

  // ---- Render helpers ----

  function renderToggle(label: string, subtitle: string | null, checked: boolean, onChange: () => void) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            checked ? 'bg-teal-500' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
    );
  }

  function renderConditionForm() {
    return (
      <div className={mode === 'edit' ? 'p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-6' : 'space-y-6'}>
        {mode === 'edit' && (
          <h3 className="text-base font-semibold text-gray-900">
            {editingConditionId ? 'Edit Condition' : 'Add Condition'}
          </h3>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Condition Type *</label>
            <Select value={conditionType} onValueChange={setConditionType}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select condition..." /></SelectTrigger>
              <SelectContent>
                {CONDITION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelClass}>Severity</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Date of Diagnosis</label>
            <input type="date" value={diagnosedAt} onChange={(e) => setDiagnosedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Diagnosed By</label>
            <input type="text" value={diagnosedBy} onChange={(e) => setDiagnosedBy(e.target.value)} placeholder="Doctor or hospital name" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Specific Diagnosis / Subtype</label>
          <input type="text" value={specificDiagnosis} onChange={(e) => setSpecificDiagnosis(e.target.value)} placeholder="e.g., ASD Level 1" className={inputClass} />
        </div>

        {/* Therapies multi-select */}
        <div>
          <label className={labelClass}>Current Therapies</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {THERAPY_TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTherapy(t.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  conditionTherapies.includes(t.value)
                    ? 'bg-teal-50 text-teal-700 border border-teal-300 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {conditionTherapies.includes(t.value) && (
                  <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div>
          <label className={labelClass}>Medications</label>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMedicationItem(); } }}
              placeholder="Add a medication..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={addMedicationItem}
              className="px-5 py-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
          {conditionMedications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {conditionMedications.map((med) => (
                <span key={med} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                  {med}
                  <button type="button" onClick={() => removeMedication(med)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Primary Challenges</label>
          <textarea value={primaryChallenges} onChange={(e) => setPrimaryChallenges(e.target.value)} placeholder="Main challenges your child faces..." className={textareaClass} />
        </div>

        <div>
          <label className={labelClass}>Strengths &amp; Interests</label>
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="Your child's strengths and interests..." className={textareaClass} />
        </div>

        <div>
          <label className={labelClass}>Additional Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other information..." className={textareaClass} />
        </div>

        {mode === 'edit' && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveCondition}
              disabled={saving || !conditionType}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingConditionId ? 'Update Condition' : 'Add Condition'}
            </button>
            <button onClick={resetConditionForm} className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-3">
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{pageSubtitle}</p>
        </div>
        <a href="/profile/edit" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </a>
      </div>

      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-start justify-between">
          {steps.map((step, i) => (
            <div key={step.id} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => mode === 'edit' ? setCurrentStep(step.id) : i < currentIndex && setCurrentStep(step.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-colors ${
                    i < currentIndex
                      ? 'bg-teal-600 text-white'
                      : i === currentIndex
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentIndex ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </button>
                <span className={`text-xs mt-2 font-medium whitespace-nowrap ${
                  i <= currentIndex ? 'text-teal-700' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mt-5 -translate-y-2.5 ${
                  i < currentIndex ? 'bg-teal-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Step 1: Basic Info                                                 */}
      {/* ================================================================= */}
      {currentStep === 'basic' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">{isAdd ? "Enter your child\u2019s basic details" : "Update your child\u2019s basic details"}</p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>First Name *</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nickname</label>
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Date of Birth *</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Gender *</label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Birth Order</label>
                <Select value={birthOrder} onValueChange={setBirthOrder}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {BIRTH_ORDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Nationality</label>
                <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Primary Language</label>
              <input type="text" value={primaryLanguage} onChange={(e) => setPrimaryLanguage(e.target.value)} placeholder="e.g., English, Tamil" className={inputClass} />
            </div>

            {renderToggle(
              'Does your child have a diagnosed or suspected condition?',
              'This will enable additional assessment fields',
              hasCondition,
              () => setHasCondition(!hasCondition),
            )}
          </div>

          <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100">
            <button onClick={() => router.push('/profile/edit')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving || !firstName || !dateOfBirth || !gender}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : hasCondition ? 'Continue' : isAdd ? 'Save Child' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 2: Education                                                  */}
      {/* ================================================================= */}
      {currentStep === 'education' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Educational Information</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">Details about your child&apos;s schooling</p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Current School</label>
                <input type="text" value={currentSchool} onChange={(e) => setCurrentSchool(e.target.value)} placeholder="School name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Grade / Class</label>
                <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., 3rd" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>School Type</label>
                <Select value={schoolType} onValueChange={setSchoolType}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {SCHOOL_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Medium of Instruction</label>
                <input type="text" value={mediumOfInstruction} onChange={(e) => setMediumOfInstruction(e.target.value)} placeholder="e.g., English" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Attendance Pattern</label>
              <Select value={attendancePattern} onValueChange={setAttendancePattern}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_PATTERN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelClass}>Teacher Concerns</label>
              <textarea value={teacherConcerns} onChange={(e) => setTeacherConcerns(e.target.value)} placeholder="Any concerns raised by teachers..." className={textareaClass} />
            </div>

            <div>
              <label className={labelClass}>Learning Difficulties</label>
              <textarea value={learningDifficulties} onChange={(e) => setLearningDifficulties(e.target.value)} placeholder="Any observed learning difficulties..." className={textareaClass} />
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100">
            <button onClick={prevStep} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Back</button>
            <button onClick={nextStep} className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 3: Birth & Medical History                                     */}
      {/* ================================================================= */}
      {currentStep === 'birth' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Birth &amp; Medical History</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">Prenatal and birth details</p>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Mother&apos;s Health During Pregnancy</label>
              <textarea value={mothersHealthDuringPregnancy} onChange={(e) => setMothersHealthDuringPregnancy(e.target.value)} placeholder="Any complications or conditions during pregnancy..." className={textareaClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Delivery Type</label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Birth Weight</label>
                <input type="text" value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} placeholder="e.g., 3.2 kg" className={inputClass} />
              </div>
            </div>

            {renderToggle('Premature Birth', 'Born before 37 weeks', prematureBirth, () => setPrematureBirth(!prematureBirth))}
            {prematureBirth && (
              <div>
                <label className={labelClass}>Gestational Age (weeks)</label>
                <input type="text" value={gestationalAge} onChange={(e) => setGestationalAge(e.target.value)} placeholder="e.g., 34 weeks" className={inputClass} />
              </div>
            )}

            <div>
              <label className={labelClass}>Birth Complications</label>
              <textarea value={birthComplications} onChange={(e) => setBirthComplications(e.target.value)} placeholder="Any complications during or after birth..." className={textareaClass} />
            </div>

            {renderToggle('Delayed Milestones', 'Delayed in reaching developmental milestones', delayedMilestones, () => setDelayedMilestones(!delayedMilestones))}
            {delayedMilestones && (
              <div>
                <label className={labelClass}>Milestone Details</label>
                <textarea value={delayedMilestonesDetails} onChange={(e) => setDelayedMilestonesDetails(e.target.value)} placeholder="Which milestones were delayed..." className={textareaClass} />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100">
            <button onClick={prevStep} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Back</button>
            <button onClick={nextStep} className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 4: Current Health                                             */}
      {/* ================================================================= */}
      {currentStep === 'health' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Current Health</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">Current health and medical information</p>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Current Medical Conditions</label>
              <textarea value={currentMedicalConditions} onChange={(e) => setCurrentMedicalConditions(e.target.value)} placeholder="Any ongoing medical conditions..." className={textareaClass} />
            </div>

            <div>
              <label className={labelClass}>Vision / Hearing Issues</label>
              <input type="text" value={visionHearingIssues} onChange={(e) => setVisionHearingIssues(e.target.value)} placeholder="Any vision or hearing concerns..." className={inputClass} />
            </div>

            {renderToggle('Currently Taking Medications', null, takingMedications, () => setTakingMedications(!takingMedications))}
            {takingMedications && (
              <div>
                <label className={labelClass}>Medication Details</label>
                <textarea value={medicationDetails} onChange={(e) => setMedicationDetails(e.target.value)} placeholder="List current medications and dosages..." className={textareaClass} />
              </div>
            )}

            <div>
              <label className={labelClass}>Family History of Developmental Disorders</label>
              <textarea value={familyHistoryOfDevelopmentalDisorders} onChange={(e) => setFamilyHistoryOfDevelopmentalDisorders(e.target.value)} placeholder="Any family members with developmental conditions..." className={textareaClass} />
            </div>

            {renderToggle('Sleep Issues', null, sleepIssues, () => setSleepIssues(!sleepIssues))}
            {sleepIssues && (
              <div>
                <label className={labelClass}>Sleep Details</label>
                <textarea value={sleepDetails} onChange={(e) => setSleepDetails(e.target.value)} placeholder="Describe sleep patterns or issues..." className={textareaClass} />
              </div>
            )}

            {renderToggle('Eating / Dietary Issues', null, eatingIssues, () => setEatingIssues(!eatingIssues))}
            {eatingIssues && (
              <div>
                <label className={labelClass}>Eating Details</label>
                <textarea value={eatingDetails} onChange={(e) => setEatingDetails(e.target.value)} placeholder="Describe eating habits or dietary concerns..." className={textareaClass} />
              </div>
            )}

            <div>
              <label className={labelClass}>Developmental Concerns</label>
              <textarea value={developmentalConcerns} onChange={(e) => setDevelopmentalConcerns(e.target.value)} placeholder="Any developmental concerns you've noticed..." className={textareaClass} />
            </div>

            {renderToggle('Previous Assessments Done', 'Has the child undergone any prior developmental assessments?', previousAssessments, () => setPreviousAssessments(!previousAssessments))}

            <div>
              <label className={labelClass}>Referral Source</label>
              <Select value={referralSource} onValueChange={setReferralSource}>
                <SelectTrigger className="w-full"><SelectValue placeholder="How did you hear about us?" /></SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100">
            <button onClick={prevStep} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Back</button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 5: Diagnosis & Conditions                                     */}
      {/* ================================================================= */}
      {currentStep === 'conditions' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Diagnosis &amp; Conditions</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">{isAdd ? "Add condition details for your child" : "Manage condition details for your child"}</p>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Diagnosis Status</label>
              <Select value={diagnosisStatus} onValueChange={setDiagnosisStatus}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {DIAGNOSIS_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edit mode: existing conditions list */}
            {mode === 'edit' && existingConditions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Existing Conditions</h3>
                {existingConditions.map((cond) => (
                  <div key={cond.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cond.conditionType}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cond.severity && `${cond.severity}`}
                        {cond.diagnosedBy && ` \u00b7 Dr. ${cond.diagnosedBy}`}
                      </p>
                      {cond.currentTherapies?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cond.currentTherapies.map((t) => (
                            <span key={t} className="inline-flex items-center px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEditCondition(cond)} className="text-gray-400 hover:text-teal-600 p-1.5 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteCondition(cond.id)} className="text-gray-400 hover:text-red-600 p-1.5 transition-colors" title="Remove">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit mode: toggle to show add form */}
            {mode === 'edit' && !showConditionForm && (
              <button
                onClick={() => { resetConditionForm(); setShowConditionForm(true); }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Condition
              </button>
            )}

            {/* Add mode: condition form always visible. Edit mode: behind toggle */}
            {(mode === 'add' || showConditionForm) && (
              <>
                {mode === 'add' && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Condition Details</h3>
                  </div>
                )}
                {renderConditionForm()}
              </>
            )}
          </div>

          <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100">
            <button onClick={prevStep} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Back</button>
            <div className="flex gap-3">
              {isAdd && !conditionType && (
                <button
                  onClick={() => { router.push('/profile/edit'); }}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-3"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={saving}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : isAdd ? 'Save Child' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
