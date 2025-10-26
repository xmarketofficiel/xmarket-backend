import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments 
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsMoroccanPhoneConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // Remove all non-digit characters except +
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check for Moroccan mobile formats:
    // 1. Local format: 06XXXXXXXX or 07XXXXXXXX (10 digits total)
    // 2. International format: +212 6XXXXXXXX or +212 7XXXXXXXX (13 characters total)
    
    // Local format validation (06 or 07 followed by 8 digits)
    if (cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) {
      return cleanPhone.length === 10;
    }
    
    // International format validation (+212 followed by 6 or 7, then 8 digits)
    if (cleanPhone.startsWith('+212')) {
      const afterCountryCode = cleanPhone.substring(4); // Remove +212
      if ((afterCountryCode.startsWith('6') || afterCountryCode.startsWith('7')) && 
          afterCountryCode.length === 9) {
        return true;
      }
    }
    
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Please enter a valid Moroccan phone number (e.g., 0612345678 or +212612345678)';
  }
}

export function IsMoroccanPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMoroccanPhoneConstraint,
    });
  };
}

/**
 * Utility function to normalize Moroccan phone numbers
 * Converts local format (06XXXXXXXX) to international format (+212 6XXXXXXXX)
 */
export function normalizeMoroccanPhone(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it's already in international format, return as is
  if (cleanPhone.startsWith('+212')) {
    return cleanPhone;
  }
  
  // If it's in local format (06 or 07), convert to international
  if ((cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) && cleanPhone.length === 10) {
    return `+212${cleanPhone.substring(1)}`; // Remove the leading 0 and add +212
  }
  
  return phoneNumber; // Return original if format is not recognized
}

/**
 * Utility function to format Moroccan phone numbers for display
 * Formats as: +212 6 12 34 56 78
 */
export function formatMoroccanPhoneDisplay(phoneNumber: string): string {
  const normalized = normalizeMoroccanPhone(phoneNumber);
  
  if (normalized.startsWith('+212') && normalized.length === 13) {
    const countryCode = '+212';
    const firstDigit = normalized.charAt(4);
    const restDigits = normalized.substring(5);
    
    // Split remaining 8 digits into groups of 2
    const formatted = `${countryCode} ${firstDigit} ${restDigits.substring(0,2)} ${restDigits.substring(2,4)} ${restDigits.substring(4,6)} ${restDigits.substring(6,8)}`;
    return formatted;
  }
  
  return phoneNumber; // Return original if can't format
}

/**
 * Utility function to convert international format to local format
 * Converts +212 6XXXXXXXX to 06XXXXXXXX
 */
export function toLocalMoroccanPhone(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it's in international format, convert to local
  if (cleanPhone.startsWith('+212') && cleanPhone.length === 13) {
    return `0${cleanPhone.substring(4)}`; // Remove +212 and add leading 0
  }
  
  return phoneNumber; // Return original if not international format
}