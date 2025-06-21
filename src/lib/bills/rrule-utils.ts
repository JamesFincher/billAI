import { RRule, RRuleSet, rrulestr } from 'rrule';
import { addDays, format, parseISO, isBefore, isAfter } from 'date-fns';
import type { RRuleConfig, GeneratedInstance } from '@/types/bill-database';

/**
 * Convert our simplified RRuleConfig to a full RRule instance
 */
export function createRRule(config: RRuleConfig, dtstart?: Date): RRule {
  const options: any = {
    freq: RRule[config.freq as keyof typeof RRule],
    dtstart: dtstart || new Date(),
  };

  if (config.interval) options.interval = config.interval;
  if (config.count) options.count = config.count;
  if (config.until) options.until = parseISO(config.until);
  if (config.byweekday) {
    options.byweekday = config.byweekday.map(day => RRule[day as keyof typeof RRule]);
  }
  if (config.bymonth) options.bymonth = config.bymonth;
  if (config.bymonthday) options.bymonthday = config.bymonthday;

  return new RRule(options);
}

/**
 * Parse an RRULE string into our RRuleConfig format
 */
export function parseRRuleString(rruleString: string): RRuleConfig {
  const rule = rrulestr(rruleString);
  const options = rule.options;

  const config: RRuleConfig = {
    freq: getFreqString(options.freq),
  };

  if (options.interval && options.interval > 1) config.interval = options.interval;
  if (options.count) config.count = options.count;
  if (options.until) config.until = format(options.until, 'yyyy-MM-dd');
  if (options.byweekday) {
    config.byweekday = options.byweekday.map(wd => getWeekdayString(wd));
  }
  if (options.bymonth) config.bymonth = options.bymonth;
  if (options.bymonthday) config.bymonthday = options.bymonthday;

  return config;
}

/**
 * Generate bill instances from a template for a specific date range
 */
export function generateBillInstances(
  rruleString: string,
  dtstart: Date,
  generateUntil: Date,
  templateData: {
    title: string;
    amount?: number;
    description?: string;
  }
): GeneratedInstance[] {
  try {
    // Parse the RRULE
    const rule = rrulestr(rruleString, { dtstart });
    
    // Get occurrences between now and generateUntil
    const occurrences = rule.between(new Date(), generateUntil, true);
    
    return occurrences.map(date => ({
      due_date: format(date, 'yyyy-MM-dd'),
      amount: templateData.amount || 0,
      title: templateData.title,
      description: templateData.description,
    }));
  } catch (error) {
    console.error('Error generating bill instances:', error);
    return [];
  }
}

/**
 * Get the next occurrence of a recurring bill
 */
export function getNextOccurrence(rruleString: string, dtstart: Date, after?: Date): Date | null {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    const after_date = after || new Date();
    const next = rule.after(after_date);
    return next;
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
}

/**
 * Get all occurrences within a date range
 */
export function getOccurrencesBetween(
  rruleString: string,
  dtstart: Date,
  from: Date,
  to: Date
): Date[] {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    return rule.between(from, to, true);
  } catch (error) {
    console.error('Error getting occurrences between dates:', error);
    return [];
  }
}

/**
 * Validate an RRULE string
 */
export function validateRRule(rruleString: string): { valid: boolean; error?: string } {
  try {
    rrulestr(rruleString);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid RRULE format' 
    };
  }
}

/**
 * Convert RRuleConfig to RRULE string
 */
export function configToRRuleString(config: RRuleConfig, dtstart?: Date): string {
  const rule = createRRule(config, dtstart);
  return rule.toString();
}

/**
 * Get human-readable description of recurrence pattern
 */
export function getRRuleDescription(rruleString: string, dtstart?: Date): string {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    return rule.toText();
  } catch (error) {
    return 'Invalid recurrence pattern';
  }
}

/**
 * Check if a date should be excluded based on template settings
 */
export function shouldExcludeDate(
  date: Date,
  template: {
    is_active: boolean;
    dtend?: string;
  }
): boolean {
  // Don't generate if template is inactive
  if (!template.is_active) return true;
  
  // Don't generate if past end date
  if (template.dtend && isAfter(date, parseISO(template.dtend))) return true;
  
  return false;
}

/**
 * Create an RRuleSet for complex patterns (multiple rules, exceptions)
 */
export function createRRuleSet(
  rules: string[],
  exceptions?: Date[],
  additions?: Date[]
): RRuleSet {
  const rruleSet = new RRuleSet();
  
  // Add all rules
  rules.forEach(ruleString => {
    try {
      const rule = rrulestr(ruleString);
      rruleSet.rrule(rule);
    } catch (error) {
      console.error('Error adding rule to set:', error);
    }
  });
  
  // Add exception dates (dates to exclude)
  exceptions?.forEach(date => {
    rruleSet.exdate(date);
  });
  
  // Add additional dates (dates to include)
  additions?.forEach(date => {
    rruleSet.rdate(date);
  });
  
  return rruleSet;
}

/**
 * Get common recurrence patterns for UI
 */
export function getCommonPatterns(): Array<{
  name: string;
  description: string;
  config: RRuleConfig;
}> {
  return [
    {
      name: 'Daily',
      description: 'Every day',
      config: { freq: 'DAILY' }
    },
    {
      name: 'Weekly',
      description: 'Every week',
      config: { freq: 'WEEKLY' }
    },
    {
      name: 'Bi-weekly',
      description: 'Every 2 weeks',
      config: { freq: 'WEEKLY', interval: 2 }
    },
    {
      name: 'Monthly',
      description: 'Every month',
      config: { freq: 'MONTHLY' }
    },
    {
      name: 'Quarterly',
      description: 'Every 3 months',
      config: { freq: 'MONTHLY', interval: 3 }
    },
    {
      name: 'Semi-annually',
      description: 'Every 6 months',
      config: { freq: 'MONTHLY', interval: 6 }
    },
    {
      name: 'Annually',
      description: 'Every year',
      config: { freq: 'YEARLY' }
    },
    {
      name: 'Weekdays',
      description: 'Monday through Friday',
      config: { 
        freq: 'WEEKLY', 
        byweekday: ['MO', 'TU', 'WE', 'TH', 'FR']
      }
    },
    {
      name: 'First of month',
      description: 'First day of every month',
      config: { 
        freq: 'MONTHLY', 
        bymonthday: [1]
      }
    },
    {
      name: 'Last of month',
      description: 'Last day of every month',
      config: { 
        freq: 'MONTHLY', 
        bymonthday: [-1]
      }
    }
  ];
}

// Helper functions
function getFreqString(freq: number): 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY' {
  switch (freq) {
    case RRule.YEARLY: return 'YEARLY';
    case RRule.MONTHLY: return 'MONTHLY';
    case RRule.WEEKLY: return 'WEEKLY';
    case RRule.DAILY: return 'DAILY';
    default: return 'DAILY';
  }
}

function getWeekdayString(weekday: any): string {
  const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  if (typeof weekday === 'number') {
    return weekdays[weekday] || 'MO';
  }
  if (weekday && typeof weekday.weekday === 'number') {
    return weekdays[weekday.weekday] || 'MO';
  }
  return 'MO';
}

/**
 * Calculate AI confidence score for recurrence pattern
 */
export function calculatePatternConfidence(
  pattern: string,
  historicalData: Array<{ due_date: string; paid_date?: string }>
): number {
  // This would be enhanced with actual ML models
  // For now, return a simple heuristic based on consistency
  
  if (historicalData.length < 3) return 0.5;
  
  // Check payment consistency
  const paymentTimings = historicalData
    .filter(bill => bill.paid_date)
    .map(bill => {
      const due = parseISO(bill.due_date);
      const paid = parseISO(bill.paid_date!);
      return Math.abs(due.getTime() - paid.getTime()) / (1000 * 60 * 60 * 24); // days
    });
  
  if (paymentTimings.length === 0) return 0.3;
  
  const avgVariance = paymentTimings.reduce((acc, timing) => acc + timing, 0) / paymentTimings.length;
  
  // Lower variance = higher confidence
  if (avgVariance <= 1) return 0.9;
  if (avgVariance <= 3) return 0.7;
  if (avgVariance <= 7) return 0.5;
  return 0.3;
} 