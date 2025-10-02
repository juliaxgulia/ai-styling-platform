/**
 * Validation utilities for user preferences including zip code and budget
 */

export interface ZipCodeValidationResult {
  isValid: boolean;
  zipCode?: string;
  error?: string;
}

export interface BudgetValidationResult {
  isValid: boolean;
  budget?: number;
  error?: string;
}

export class PreferenceValidationService {
  
  /**
   * Validate US zip code format
   */
  validateZipCode(input: string): ZipCodeValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: 'Zip code is required'
      };
    }

    // Remove any whitespace
    const cleanInput = input.trim();

    // Check for 5-digit zip code format
    const fiveDigitPattern = /^\d{5}$/;
    if (fiveDigitPattern.test(cleanInput)) {
      return {
        isValid: true,
        zipCode: cleanInput
      };
    }

    // Check for 5+4 zip code format (12345-6789)
    const extendedPattern = /^\d{5}-\d{4}$/;
    if (extendedPattern.test(cleanInput)) {
      return {
        isValid: true,
        zipCode: cleanInput.substring(0, 5) // Return just the 5-digit portion
      };
    }

    // Check for 9-digit format without dash (123456789)
    const nineDigitPattern = /^\d{9}$/;
    if (nineDigitPattern.test(cleanInput)) {
      return {
        isValid: true,
        zipCode: cleanInput.substring(0, 5) // Return just the first 5 digits
      };
    }

    return {
      isValid: false,
      error: 'Invalid zip code format. Please enter a 5-digit US zip code (e.g., 12345)'
    };
  }

  /**
   * Validate budget range
   */
  validateBudget(input: string | number): BudgetValidationResult {
    if (input === null || input === undefined || input === '') {
      return {
        isValid: false,
        error: 'Budget is required'
      };
    }

    let numericBudget: number;

    if (typeof input === 'string') {
      // Remove common currency symbols and whitespace
      const cleanInput = input.replace(/[$,\s]/g, '');
      
      // Try to parse as number
      numericBudget = parseFloat(cleanInput);
    } else {
      numericBudget = input;
    }

    // Check if it's a valid number
    if (isNaN(numericBudget) || !isFinite(numericBudget)) {
      return {
        isValid: false,
        error: 'Budget must be a valid number'
      };
    }

    // Check minimum budget (at least $10)
    if (numericBudget < 10) {
      return {
        isValid: false,
        error: 'Budget must be at least $10'
      };
    }

    // Check maximum budget (reasonable upper limit of $10,000)
    if (numericBudget > 10000) {
      return {
        isValid: false,
        error: 'Budget must be less than $10,000'
      };
    }

    // Round to nearest dollar
    const roundedBudget = Math.round(numericBudget);

    return {
      isValid: true,
      budget: roundedBudget
    };
  }

  /**
   * Extract zip code from natural language text
   */
  extractZipCodeFromText(text: string): string | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Look for 5-digit patterns that could be zip codes
    const zipPattern = /\b\d{5}\b/g;
    const matches = text.match(zipPattern);

    if (matches && matches.length > 0) {
      // Return the first match that looks like a valid zip code
      for (const match of matches) {
        const validation = this.validateZipCode(match);
        if (validation.isValid) {
          return validation.zipCode!;
        }
      }
    }

    return null;
  }

  /**
   * Extract budget from natural language text
   */
  extractBudgetFromText(text: string): number | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Look for currency patterns
    const currencyPatterns = [
      /\$\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g, // $500, $1,000, $1,500.00
      /(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/gi, // 500 dollars, 1,000 dollars
      /(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*bucks?/gi, // 500 bucks
      /around\s*\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi, // around $500
      /about\s*\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi, // about $500
      /up\s*to\s*\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi, // up to $500
      /budget\s*(?:is|of)?\s*\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi, // budget is $500
    ];

    for (const pattern of currencyPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Extract the numeric part from the first match
        const numericMatch = matches[0].match(/(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/);
        if (numericMatch) {
          const budgetText = numericMatch[1].replace(/,/g, '');
          const validation = this.validateBudget(budgetText);
          if (validation.isValid) {
            return validation.budget!;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get budget range suggestions based on extracted budget
   */
  getBudgetRangeSuggestions(budget?: number): Array<{ label: string; value: number }> {
    const ranges = [
      { label: 'Under $100', value: 75 },
      { label: '$100 - $250', value: 175 },
      { label: '$250 - $500', value: 375 },
      { label: '$500 - $750', value: 625 },
      { label: '$750 - $1,000', value: 875 },
      { label: '$1,000 - $1,500', value: 1250 },
      { label: '$1,500 - $2,000', value: 1750 },
      { label: '$2,000+', value: 2500 },
    ];

    // If we have a budget, highlight the appropriate range
    if (budget) {
      return ranges.map(range => ({
        ...range,
        suggested: budget >= (range.value - 75) && budget <= (range.value + 75)
      }));
    }

    return ranges;
  }

  /**
   * Get climate information based on zip code (simplified for MVP)
   */
  getClimateInfo(zipCode: string): { region: string; climate: string } | null {
    if (!zipCode || !this.validateZipCode(zipCode).isValid) {
      return null;
    }

    // Simplified climate mapping based on zip code ranges
    // In a production app, you'd use a proper weather API
    const zip = parseInt(zipCode);

    if (zip >= 10000 && zip <= 19999) {
      return { region: 'Northeast', climate: 'Continental' };
    } else if (zip >= 20000 && zip <= 29999) {
      return { region: 'Southeast', climate: 'Humid Subtropical' };
    } else if (zip >= 30000 && zip <= 39999) {
      return { region: 'Southeast', climate: 'Humid Subtropical' };
    } else if (zip >= 40000 && zip <= 49999) {
      return { region: 'Midwest', climate: 'Continental' };
    } else if (zip >= 50000 && zip <= 59999) {
      return { region: 'Midwest', climate: 'Continental' };
    } else if (zip >= 60000 && zip <= 69999) {
      return { region: 'Midwest', climate: 'Continental' };
    } else if (zip >= 70000 && zip <= 79999) {
      return { region: 'South', climate: 'Humid Subtropical' };
    } else if (zip >= 80000 && zip <= 89999) {
      return { region: 'Mountain West', climate: 'Arid/Semi-Arid' };
    } else if (zip >= 90000 && zip <= 99999) {
      return { region: 'West Coast', climate: 'Mediterranean/Oceanic' };
    }

    return { region: 'Unknown', climate: 'Temperate' };
  }
}

export const preferenceValidationService = new PreferenceValidationService();