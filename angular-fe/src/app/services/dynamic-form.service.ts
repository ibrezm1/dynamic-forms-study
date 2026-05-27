import { Injectable } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

export interface FieldValidation {
  type: string;
  value?: any;
  message: string;
}

export interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validations?: FieldValidation[];
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  backendValidation?: {
    url: string;
    method: string;
  };
  fields: FormField[];
}

export interface FormSchema {
  steps: FormStep[];
}

@Injectable({
  providedIn: 'root'
})
export class DynamicFormService {

  createFormGroup(schema: FormSchema): FormGroup {
    const group: { [key: string]: FormGroup } = {};

    schema.steps.forEach(step => {
      const stepControls: { [key: string]: FormControl } = {};

      step.fields.forEach(field => {
        const validators: ValidatorFn[] = [];

        if (field.validations) {
          field.validations.forEach(val => {
            switch (val.type) {
              case 'required':
                validators.push(Validators.required);
                break;
              case 'requiredTrue':
                validators.push(Validators.requiredTrue);
                break;
              case 'minLength':
                validators.push(Validators.minLength(Number(val.value)));
                break;
              case 'maxLength':
                validators.push(Validators.maxLength(Number(val.value)));
                break;
              case 'pattern':
                validators.push(Validators.pattern(val.value));
                break;
            }
          });
        }

        stepControls[field.id] = new FormControl(
          field.defaultValue !== undefined ? field.defaultValue : '',
          validators
        );
      });

      group[step.id] = new FormGroup(stepControls);
    });

    return new FormGroup(group);
  }
}
