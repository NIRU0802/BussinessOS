import apiClient from "../api-client";

// ---- Categories ----

export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export async function listCategories(): Promise<MenuCategory[]> {
  const res = await apiClient.get<MenuCategory[]>("/menu/categories");
  return res.data;
}

export async function createCategory(input: CreateCategoryInput): Promise<MenuCategory> {
  const res = await apiClient.post<MenuCategory>("/menu/categories", input);
  return res.data;
}

export async function updateCategory(
  id: string,
  input: Partial<CreateCategoryInput>,
): Promise<MenuCategory> {
  const res = await apiClient.patch<MenuCategory>(`/menu/categories/${id}`, input);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/menu/categories/${id}`);
}

// ---- Menu Items ----

export interface MenuItemVariant {
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: string;
  imageKey: string | null;
  imageUrl?: string | null;
  isVegetarian: boolean;
  sortOrder: number;
  isActive: boolean;
  taxClassId: string | null;
  availableDays: string[];
  availableFromTime: string | null;
  availableToTime: string | null;
}

export interface CreateMenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  isVegetarian?: boolean;
  sortOrder?: number;
  variants?: MenuItemVariant[];
  modifierGroupIds?: string[];
  taxClassId?: string;
  availableDays?: string[];
  availableFromTime?: string;
  availableToTime?: string;
}

export async function listMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const res = await apiClient.get<MenuItem[]>("/menu/items", {
    params: categoryId ? { categoryId } : undefined,
  });
  return res.data;
}

export async function getMenuItem(id: string): Promise<MenuItem> {
  const res = await apiClient.get<MenuItem>(`/menu/items/${id}`);
  return res.data;
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  const res = await apiClient.post<MenuItem>("/menu/items", input);
  return res.data;
}

export async function updateMenuItem(
  id: string,
  input: Partial<CreateMenuItemInput>,
): Promise<MenuItem> {
  const res = await apiClient.patch<MenuItem>(`/menu/items/${id}`, input);
  return res.data;
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiClient.delete(`/menu/items/${id}`);
}

export async function attachModifierGroup(itemId: string, groupId: string): Promise<void> {
  await apiClient.post(`/menu/items/${itemId}/modifier-groups/${groupId}`);
}

export async function detachModifierGroup(itemId: string, groupId: string): Promise<void> {
  await apiClient.delete(`/menu/items/${itemId}/modifier-groups/${groupId}`);
}

export async function uploadMenuItemImage(itemId: string, file: File): Promise<MenuItem> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<MenuItem>(`/menu/items/${itemId}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// ---- Modifier Groups ----

export interface ModifierOption {
  id: string;
  modifierGroupId: string;
  name: string;
  priceDelta: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  tenantId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOption[];
}

export interface CreateModifierGroupInput {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  isRequired?: boolean;
  options: { name: string; priceDelta?: number }[];
}

export async function listModifierGroups(): Promise<ModifierGroup[]> {
  const res = await apiClient.get<ModifierGroup[]>("/menu/modifier-groups");
  return res.data;
}

export async function createModifierGroup(input: CreateModifierGroupInput): Promise<ModifierGroup> {
  const res = await apiClient.post<ModifierGroup>("/menu/modifier-groups", input);
  return res.data;
}

export async function addModifierOption(
  groupId: string,
  input: { name: string; priceDelta?: number },
): Promise<ModifierOption> {
  const res = await apiClient.post<ModifierOption>(
    `/menu/modifier-groups/${groupId}/options`,
    input,
  );
  return res.data;
}

export async function removeModifierOption(optionId: string): Promise<void> {
  await apiClient.delete(`/menu/modifier-groups/options/${optionId}`);
}

export async function deleteModifierGroup(id: string): Promise<void> {
  await apiClient.delete(`/menu/modifier-groups/${id}`);
}

// ---- Combos ----

export interface ComboItem {
  id: string;
  comboId: string;
  menuItemId: string;
  quantity: number;
}

export interface Combo {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  comboPrice: string;
  imageKey: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  items: ComboItem[];
  suggestedPrice?: string;
}

export interface CreateComboInput {
  name: string;
  description?: string;
  comboPrice: number;
  items: { menuItemId: string; quantity: number }[];
}

export async function listCombos(): Promise<Combo[]> {
  const res = await apiClient.get<Combo[]>("/menu/combos");
  return res.data;
}

export async function createCombo(input: CreateComboInput): Promise<Combo> {
  const res = await apiClient.post<Combo>("/menu/combos", input);
  return res.data;
}

export async function updateCombo(id: string, input: Partial<CreateComboInput>): Promise<Combo> {
  const res = await apiClient.patch<Combo>(`/menu/combos/${id}`, input);
  return res.data;
}

export async function deleteCombo(id: string): Promise<void> {
  await apiClient.delete(`/menu/combos/${id}`);
}

export async function uploadComboImage(comboId: string, file: File): Promise<Combo> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<Combo>(`/menu/combos/${comboId}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// ----
// ---- Branch Overrides ----

export interface BranchMenuItemOverride {
  id: string;
  tenantId: string;
  branchId: string;
  menuItemId: string;
  priceOverride: string | null;
  isAvailable: boolean;
  isHidden: boolean;
  availableDays: string[];
  availableFromTime: string | null;
  availableToTime: string | null;
  menuItem: {
    id: string;
    name: string;
    basePrice: string;
  };
}

export interface SetBranchOverrideInput {
  branchId: string;
  menuItemId: string;
  priceOverride?: number | null;
  isAvailable?: boolean;
  isHidden?: boolean;
  availableDays?: string[];
  availableFromTime?: string;
  availableToTime?: string;
}

export async function listBranchOverrides(branchId: string): Promise<BranchMenuItemOverride[]> {
  const res = await apiClient.get<BranchMenuItemOverride[]>(
    `/menu/branch-overrides/branch/${branchId}`,
  );
  return res.data;
}

export async function setBranchOverride(
  input: SetBranchOverrideInput,
): Promise<BranchMenuItemOverride> {
  const res = await apiClient.post<BranchMenuItemOverride>("/menu/branch-overrides", input);
  return res.data;
}

export async function clearBranchOverride(branchId: string, menuItemId: string): Promise<void> {
  await apiClient.delete(`/menu/branch-overrides/${branchId}/${menuItemId}`);
}
