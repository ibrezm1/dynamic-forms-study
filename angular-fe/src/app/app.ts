import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { DynamicFormService, FormSchema, FormStep } from './services/dynamic-form.service';
import { MockBackendService } from './services/mock-backend.service';
import { StepperComponent, StepStatus } from './components/stepper/stepper';
import { DynamicFormComponent } from './components/dynamic-form/dynamic-form';

export interface Profile {
  id: string;
  schemaRef: string;
  data: any;
  timestamp?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StepperComponent, DynamicFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  schema: FormSchema | null = null;
  formGroup: FormGroup | null = null;
  
  // Dashboard vs Form Onboarding view states
  currentView: 'dashboard' | 'form' = 'dashboard';
  
  // Storage for all completed onboarding profiles, loaded dynamically from profiles.json
  profiles: Profile[] = [];
  
  editingProfileId: string | null = null;
  
  // Track which schema is currently loaded/active for the dynamic form
  activeSchemaRef: string = 'form-schema-1.json';
  
  // Dynamically populated schemas array fetched from backend schemas database
  availableSchemas: { id: string; label: string }[] = [];
  
  // Toggles the dropdown list visibility for the dynamic flow onboarding buttons
  showCreateMenu = false;
  
  // Tracks light/dark layout state
  isLightTheme = false;
  
  currentStepIndex = 0;
  stepStatuses: StepStatus[] = [];
  
  // Stores server/backend validation errors indexed by stepId -> fieldId -> errorMsg
  backendErrors: { [stepId: string]: { [fieldId: string]: string } } = {};
  
  isValidating = false;
  isSubmitted = false;

  constructor(
    private formService: DynamicFormService,
    private backendService: MockBackendService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initial fetch of default profiles
    this.loadProfiles();
    // Dynamically retrieve available onboarding flow schemas
    this.loadSchemas();
  }

  private async loadProfiles(): Promise<void> {
    try {
      // Retrieve profiles directly from the REST API to bypass client-side static asset caching
      const response = await fetch('/api/profiles?t=' + Date.now());
      if (response.ok) {
        this.profiles = await response.json();
      }
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading default profiles:', error);
    }
  }

  private async loadSchemas(): Promise<void> {
    try {
      const response = await fetch('/api/schemas?t=' + Date.now());
      if (response.ok) {
        this.availableSchemas = await response.json();
      }
      this.cdr.markForCheck();
    } catch (e) {
      console.error('Error fetching available schemas:', e);
    }
  }

  toggleCreateMenu(): void {
    this.showCreateMenu = !this.showCreateMenu;
    this.cdr.markForCheck();
  }

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    const root = document.documentElement;
    if (this.isLightTheme) {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
    this.cdr.markForCheck();
  }

  private initializeForm(schema: FormSchema): void {
    this.formGroup = this.formService.createFormGroup(schema);
    
    // Initialize all steps with their starting statuses
    this.stepStatuses = schema.steps.map((_, idx) => idx === 0 ? 'active' : 'pending');
    
    // Initialize backend error objects for each step
    schema.steps.forEach(step => {
      this.backendErrors[step.id] = {};
    });
  }

  get currentStep(): FormStep | null {
    if (!this.schema || this.currentStepIndex >= this.schema.steps.length) return null;
    return this.schema.steps[this.currentStepIndex];
  }

  get currentStepGroup(): FormGroup | null {
    const step = this.currentStep;
    if (!this.formGroup || !step) return null;
    return this.formGroup.get(step.id) as FormGroup;
  }

  // Dashboard actions
  async startNewProfile(schemaRef: string): Promise<void> {
    this.showCreateMenu = false;
    this.editingProfileId = null;
    this.activeSchemaRef = schemaRef;
    this.isSubmitted = false;
    this.currentStepIndex = 0;
    this.isValidating = true;
    
    try {
      const response = await fetch(`/api/schemas/${schemaRef}`);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      this.schema = await response.json();
      this.isValidating = false;
      
      if (this.schema) {
        this.initializeForm(this.schema);
      }
      
      this.currentView = 'form';
      this.cdr.markForCheck();
    } catch (e) {
      this.isValidating = false;
      console.error('Error fetching schema:', e);
    }
  }

  async editProfile(profile: Profile): Promise<void> {
    this.editingProfileId = profile.id;
    this.activeSchemaRef = profile.schemaRef;
    this.isSubmitted = false;
    this.currentStepIndex = 0;
    this.isValidating = true;
    
    try {
      const response = await fetch(`/api/schemas/${profile.schemaRef}`);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      this.schema = await response.json();
      this.isValidating = false;
      
      if (this.schema) {
        this.initializeForm(this.schema);
        // Prepopulate form fields with the selected profile's values once FormGroup structure matches
        this.formGroup?.patchValue(profile.data);
        
        // Since it's editing a completed profile, make all steps visited/completed but first step active
        this.stepStatuses = this.schema.steps.map(() => 'completed' as StepStatus);
        this.stepStatuses[0] = 'active';
      }
      
      this.currentView = 'form';
      this.cdr.markForCheck();
    } catch (e) {
      this.isValidating = false;
      console.error('Error loading schema for editing:', e);
    }
  }

  async deleteProfile(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await this.loadProfiles();
      }
    } catch (e) {
      console.error('Error deleting profile:', e);
    }
  }

  exitToDashboard(): void {
    this.editingProfileId = null;
    this.currentView = 'dashboard';
    this.cdr.markForCheck();
  }

  onStepClick(index: number): void {
    if (this.isValidating || this.isSubmitted) return;
    
    // Allow jumping to any step that is NOT pending
    if (this.stepStatuses[index] !== 'pending') {
      const prevActiveIndex = this.currentStepIndex;
      const prevActiveGroup = this.currentStepGroup;
      
      if (prevActiveGroup && prevActiveIndex !== index) {
        if (prevActiveGroup.invalid) {
          this.stepStatuses[prevActiveIndex] = 'error';
        } else if (this.stepStatuses[prevActiveIndex] === 'active') {
          this.stepStatuses[prevActiveIndex] = 'completed';
        }
      }

      this.currentStepIndex = index;
      this.stepStatuses[index] = 'active';
    }
  }

  async onNextStep(): Promise<void> {
    if (this.isValidating) return;

    const step = this.currentStep;
    const group = this.currentStepGroup;
    if (!step || !group) return;

    // 1. Trigger client side static validations (touch all fields)
    group.markAllAsTouched();

    if (group.invalid) {
      this.stepStatuses[this.currentStepIndex] = 'error';
      return;
    }

    // 2. Clear previous errors and invoke backend API validation using the URL defined in the step schema
    this.backendErrors[step.id] = {};
    this.isValidating = true;
    this.stepStatuses[this.currentStepIndex] = 'validating';

    const url = step.backendValidation?.url;
    this.backendService.validateStep(step.id, group.value, url, this.editingProfileId).subscribe({
      next: (response) => {
        this.isValidating = false;

        if (response.success) {
          // Mark current step completed
          this.stepStatuses[this.currentStepIndex] = 'completed';
          
          // Proceed to next step if there is one
          if (this.schema && this.currentStepIndex < this.schema.steps.length - 1) {
            this.currentStepIndex++;
            // Mark next step as active
            this.stepStatuses[this.currentStepIndex] = 'active';
          }
        } else {
          // Display backend validation errors on fields
          this.backendErrors[step.id] = response.errors || {};
          this.stepStatuses[this.currentStepIndex] = 'error';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isValidating = false;
        this.stepStatuses[this.currentStepIndex] = 'error';
        console.error('Validation API Error:', err);
        this.cdr.markForCheck();
      }
    });
  }

  onPrevStep(): void {
    if (this.isValidating || this.currentStepIndex === 0) return;

    const group = this.currentStepGroup;
    if (group) {
      if (group.invalid) {
        this.stepStatuses[this.currentStepIndex] = 'error';
      } else {
        this.stepStatuses[this.currentStepIndex] = 'completed';
      }
    }

    this.currentStepIndex--;
    this.stepStatuses[this.currentStepIndex] = 'active';
  }

  async onSubmitForm(): Promise<void> {
    if (this.isValidating) return;

    const step = this.currentStep;
    const group = this.currentStepGroup;
    if (!step || !group || !this.schema) return;

    // 1. Check client side static validations
    group.markAllAsTouched();
    if (group.invalid) {
      this.stepStatuses[this.currentStepIndex] = 'error';
      return;
    }

    // 2. Run backend validation on the last page before final submission using the URL defined in the step schema
    this.backendErrors[step.id] = {};
    this.isValidating = true;
    this.stepStatuses[this.currentStepIndex] = 'validating';

    const url = step.backendValidation?.url;
    this.backendService.validateStep(step.id, group.value, url, this.editingProfileId).subscribe({
      next: (response) => {
        this.isValidating = false;

        if (response.success) {
          this.stepStatuses[this.currentStepIndex] = 'completed';
          this.isSubmitted = true;
        } else {
          this.backendErrors[step.id] = response.errors || {};
          this.stepStatuses[this.currentStepIndex] = 'error';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isValidating = false;
        this.stepStatuses[this.currentStepIndex] = 'error';
        console.error('Submission validation failed:', err);
        this.cdr.markForCheck();
      }
    });
  }

  async onSaveProfile(): Promise<void> {
    if (!this.formGroup) return;

    const formData = this.formGroup.value;
    let targetProfile: Profile;

    if (this.editingProfileId) {
      // Edit mode: update existing profile
      targetProfile = {
        id: this.editingProfileId,
        schemaRef: this.activeSchemaRef,
        data: formData
      };
    } else {
      // Create mode: add new profile preserving active schemaRef
      targetProfile = {
        id: 'profile-' + Date.now(),
        schemaRef: this.activeSchemaRef,
        data: formData
      };
    }

    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetProfile)
      });
      
      if (response.ok) {
        await this.loadProfiles();
      }
    } catch (e) {
      console.error('Error saving profile to database:', e);
    }

    this.editingProfileId = null;
    this.isSubmitted = false;
    this.currentView = 'dashboard';
    this.cdr.markForCheck();
  }

  onClearBackendError(fieldId: string): void {
    const step = this.currentStep;
    if (step && this.backendErrors[step.id] && this.backendErrors[step.id][fieldId]) {
      delete this.backendErrors[step.id][fieldId];
      
      const group = this.currentStepGroup;
      if (group && group.valid && this.stepStatuses[this.currentStepIndex] === 'error') {
        this.stepStatuses[this.currentStepIndex] = 'active';
      }
    }
  }

  getSummaryData(): { label: string; value: any }[] {
    if (!this.schema || !this.formGroup) return [];

    const summary: { label: string; value: any }[] = [];

    this.schema.steps.forEach(step => {
      const stepGroup = this.formGroup?.get(step.id) as FormGroup;
      if (stepGroup) {
        step.fields.forEach(field => {
          const rawVal = stepGroup.get(field.id)?.value;
          let displayVal = rawVal;

          if (field.type === 'checkbox') {
            displayVal = rawVal ? 'Yes ✓' : 'No ✖';
          } else if (field.type === 'select') {
            const selectedOpt = field.options?.find(o => o.value === rawVal);
            displayVal = selectedOpt ? selectedOpt.label : rawVal;
          }

          summary.push({
            label: field.label,
            value: displayVal || 'Not filled'
          });
        });
      }
    });

    return summary;
  }

  getProfileDisplayName(profile: Profile): string {
    const step1 = profile.data['step-1'] || {};
    const first = step1.firstName || '';
    const last = step1.lastName || '';
    return first || last ? `${first} ${last}`.trim() : 'Unnamed Profile';
  }

  getProfileEmail(profile: Profile): string {
    return profile.data['step-1']?.email || 'N/A';
  }

  getProfileUsername(profile: Profile): string {
    return profile.data['step-2']?.username || 'N/A';
  }

  getProfileExperienceLabel(profile: Profile): string {
    // Schema 1 has experience, Schema 2 has company & role
    if (profile.schemaRef === 'form-schema-1.json') {
      const val = profile.data['step-2']?.experience || '';
      if (val === 'junior') return 'Junior';
      if (val === 'intermediate') return 'Intermediate';
      if (val === 'senior') return 'Senior';
      return 'N/A';
    } else {
      const company = profile.data['step-2']?.company || '';
      const role = profile.data['step-2']?.role || '';
      const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
      return company && formattedRole ? `${formattedRole} at ${company}` : company || formattedRole || 'N/A';
    }
  }

  getSchemaLabel(schemaRef: string): string {
    return schemaRef === 'form-schema-1.json' ? 'Standard' : 'Professional';
  }

  formatTimestamp(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  }
}
