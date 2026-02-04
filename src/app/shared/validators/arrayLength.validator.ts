import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minLengthArray(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control.value as any[];
    return arr && arr.length >= min ? null : { minLengthArray: { requiredLength: min, actualLength: arr?.length || 0 } };
  };
}