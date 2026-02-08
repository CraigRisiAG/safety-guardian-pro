// Utility functions for mapping safety roles to compliance check categories
import { SafetyRole, ComplianceCategory, DEFAULT_COMPLIANCE_CATEGORIES } from '@/types/admin';

// Map check categories to required safety roles
// H&S Officers can do ALL checks
// Fire Marshalls can do fire-safety checks
// Evacuation Wardens can do evacuation-related checks (equipment related to evacuation)
// First Aiders can do first-aid checks
export const CATEGORY_TO_SAFETY_ROLES: Record<string, SafetyRole[]> = {
  'fire-safety': ['fire_marshall', 'health_safety_officer'],
  'electrical': ['health_safety_officer'], // Only H&S officers for electrical
  'first-aid': ['first_aider', 'health_safety_officer'],
  'equipment': ['evacuation_warden', 'health_safety_officer'], // Equipment includes evacuation equipment
  'training': ['health_safety_officer'], // Only H&S officers for training
};

/**
 * Get the safety roles that are qualified to perform a check in a given category
 */
export function getQualifiedRolesForCategory(categoryId: string): SafetyRole[] {
  return CATEGORY_TO_SAFETY_ROLES[categoryId] || ['health_safety_officer'];
}

/**
 * Check if a user's safety roles qualify them for a specific check category
 */
export function userCanPerformCheckCategory(
  userSafetyRoles: SafetyRole[],
  categoryId: string
): boolean {
  const qualifiedRoles = getQualifiedRolesForCategory(categoryId);
  return userSafetyRoles.some(role => qualifiedRoles.includes(role));
}

/**
 * Get a human-readable description of which roles can perform a check
 */
export function getQualifiedRolesDescription(categoryId: string): string {
  const roles = getQualifiedRolesForCategory(categoryId);
  const roleLabels: Record<SafetyRole, string> = {
    fire_marshall: 'Fire Marshall',
    evacuation_warden: 'Evacuation Warden',
    first_aider: 'First Aider',
    health_safety_officer: 'H&S Officer',
  };
  
  return roles.map(r => roleLabels[r]).join(', ');
}
