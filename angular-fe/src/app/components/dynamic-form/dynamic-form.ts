import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormStep, FormField } from '../../services/dynamic-form.service';
import { Subscription } from 'rxjs';

/**
 * DynamicFormComponent acts as the dynamic field compiler and renderer for the active step.
 * It renders controls (inputs, dropdowns, checkboxes), handles real-time input change hooks
 * to clear backend validation states on modified fields, and matches validation rulesets
 * dynamically to display clear static and remote API error feedback.
 */
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.css'
})
export class DynamicFormComponent implements OnChanges, OnDestroy {
  /**
   * The structural details and fields configuration of the current step from the JSON schema.
   */
  @Input() step!: FormStep;

  /**
   * The Angular Reactive Forms FormGroup instance governing the fields of the active step.
   */
  @Input() formGroup!: FormGroup;

  /**
   * Remote server-side validation error alerts received from the Mock Backend API,
   * indexed by field ID mapping to error message details.
   */
  @Input() backendErrors: { [key: string]: string } = {};

  /**
   * Emitted to the parent controller when a user modifies an input that has an uncleared backend error.
   */
  @Output() clearBackendError = new EventEmitter<string>();

  /**
   * Array of active RxJS subscriptions used to monitor input value changes and trigger error clears.
   */
  private subscriptions: Subscription[] = [];

  /**
   * Angular Lifecycle hook capturing component input modifications.
   * If the active step or parent formGroup changes, it safely cleans up existing value observers
   * and rebuilds new RxJS subscription watchers.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['step'] || changes['formGroup']) {
      this.unsubscribeAll();
      this.subscribeToValueChanges();
    }
  }

  /**
   * Releases and unsubscribes from all active observers to prevent memory leaks.
   */
  private unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Binds observers to every form control in the current step.
   * If a field currently has an active backend validation error and the user starts typing,
   * it triggers the 'clearBackendError' emitter to dismiss the error and restore form visual states.
   */
  private subscribeToValueChanges(): void {
    if (!this.step || !this.formGroup) return;

    this.step.fields.forEach(field => {
      const control = this.formGroup.get(field.id);
      if (control) {
        const sub = control.valueChanges.subscribe(() => {
          if (this.backendErrors[field.id]) {
            this.clearBackendError.emit(field.id);
          }
        });
        this.subscriptions.push(sub);
      }
    });
  }

  /**
   * Inspects the schema validations array to confirm if a specific field is marked required.
   * Used in the UI to dynamically append modern red asterisks (*) next to labels.
   *
   * @param field The field layout configuration.
   * @returns boolean True if required.
   */
  isRequired(field: FormField): boolean {
    if (!field.validations) return false;
    return field.validations.some(v => v.type === 'required' || v.type === 'requiredTrue');
  }

  /**
   * Evaluates if a field input is in an invalid/error state.
   * A field is considered errored if:
   * 1. The client-side static constraints are broken AND the input has been touched.
   * 2. Or, a backend error is registered against this field.
   *
   * @param field The target form field schema.
   * @returns boolean True if an error should be highlighted on the UI.
   */
  hasError(field: FormField): boolean {
    const control = this.formGroup.get(field.id);
    if (!control) return false;

    // Has static validation error that should show up
    const hasStaticError = control.invalid && control.touched;
    // Has un-cleared backend error
    const hasBackendError = !!this.backendErrors[field.id];

    return hasStaticError || hasBackendError;
  }

  /**
   * Formulates the error feedback message to render under the field.
   * Prioritizes active local static rules (e.g. minLength, pattern) if violated and touched,
   * before falling back to showing mock backend validation error responses.
   *
   * @param field The target form field configuration.
   * @returns string The human-readable error text to display.
   */
  getErrorMessage(field: FormField): string {
    const control = this.formGroup.get(field.id);
    if (!control) return '';

    // Prioritize static errors if control has been touched and failed client validations
    if (control.invalid && control.touched && field.validations) {
      for (const validation of field.validations) {
        const type = validation.type;
        if (type === 'required' && control.hasError('required')) {
          return validation.message;
        }
        if (type === 'requiredTrue' && control.hasError('required')) {
          return validation.message;
        }
        if (type === 'minLength' && control.hasError('minlength')) {
          return validation.message;
        }
        if (type === 'maxLength' && control.hasError('maxlength')) {
          return validation.message;
        }
        if (type === 'pattern' && control.hasError('pattern')) {
          return validation.message;
        }
      }
    }

    // Fall back to server/backend validation error
    if (this.backendErrors[field.id]) {
      return this.backendErrors[field.id];
    }

    return '';
  }

  /**
   * Component destruction lifecycle hook.
   * Ensures all observers are cleanly unsubscribed to maintain a leakage-free runtime.
   */
  ngOnDestroy(): void {
    this.unsubscribeAll();
  }
}
