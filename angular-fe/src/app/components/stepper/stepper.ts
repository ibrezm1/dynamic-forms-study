import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormStep } from '../../services/dynamic-form.service';

/**
 * Defines the strict structural lifecycle states a single wizard step can experience:
 * - 'pending': Grayed out, unvisited stage ahead of the user's progress.
 * - 'active': The currently selected/visible wizard panel.
 * - 'validating': Actively performing asynchronous mock API checks (spinning status).
 * - 'completed': Passed all static client validations and server-side responses (green checkmark).
 * - 'error': Failed either a static required check or was rejected by backend validation (red highlight/vibe shake).
 */
export type StepStatus = 'pending' | 'active' | 'validating' | 'completed' | 'error';

/**
 * StepperComponent renders the vertical step progression layout on the left sidebar.
 * It tracks visual states, handles click navigation for previously visited steps,
 * and renders structural state indicators in complete synchronicity with parent form changes.
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
})
export class StepperComponent {
  /**
   * The list of step configurations parsed from the JSON schema (titles, descriptions, fields).
   */
  @Input() steps: FormStep[] = [];

  /**
   * The 0-based index of the currently active dynamic onboarding step.
   */
  @Input() currentStepIndex = 0;

  /**
   * An array parallel to 'steps' containing the live validation and progress state of each step.
   */
  @Input() statuses: StepStatus[] = [];
  
  /**
   * Emits the selected step index to the parent controller when a valid visited step is clicked.
   */
  @Output() stepClick = new EventEmitter<number>();

  /**
   * Evaluates if a given step index is interactive.
   * A step is interactive/clickable if it is not in the default 'pending' state,
   * meaning the user has already visited and initiated validation checks on it.
   *
   * @param index The step index to check.
   * @returns boolean True if the user can jump to this step.
   */
  isClickable(index: number): boolean {
    return this.statuses[index] !== 'pending';
  }

  /**
   * Handles user interaction with a specific step item.
   * If the step is clickable (visited), it notifies the parent component to transition the view.
   *
   * @param index The index of the clicked step.
   */
  onStepClick(index: number): void {
    if (this.isClickable(index)) {
      this.stepClick.emit(index);
    }
  }

  /**
   * Determines if the vertical line connecting the previous step to the current step should
   * render with the active/completed highlighting.
   *
   * @param index The index of the target step.
   * @returns boolean True if the connector line should be styled as filled/completed.
   */
  isLineFilled(index: number): boolean {
    return this.statuses[index - 1] === 'completed';
  }

  /**
   * Resolves a human-readable badge label matching the current step's technical state.
   * Used directly inside the HTML templates for accessible and premium screen-reader support.
   *
   * @param status The current StepStatus.
   * @returns string The user-friendly status badge text.
   */
  getStatusLabel(status: StepStatus): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'active': return 'In Progress';
      case 'validating': return 'Verifying Server';
      case 'completed': return 'Completed';
      case 'error': return 'Fix Details';
      default: return '';
    }
  }
}
