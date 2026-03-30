export type MenuCategory = "Cafe" | "Pasteleria" | "Bebidas frias";

export type Modifier = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
};

export type Product = {
  id: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  modifierGroupIds: string[];
  isWeighable: boolean;
  availableInPos: boolean;
  kind: "single" | "bundle";
  bundleItems: Array<{
    productId: string;
    qty: number;
  }>;
  recipeItems: Array<{
    ingredientProductId: string;
    qty: number;
  }>;
  branchPrices?: Array<{
    branchId: string;
    price: number;
  }>;
};

export const CATEGORIES = ["Todos", "Cafe", "Pasteleria", "Bebidas frias"] as const;

export const DEFAULT_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: "milk",
    name: "Tipo de leche",
    minSelect: 0,
    maxSelect: 1,
    modifiers: [
      { id: "milk-regular", name: "Regular", priceDelta: 0 },
      { id: "milk-almond", name: "Almendra", priceDelta: 500 },
      { id: "milk-oat", name: "Avena", priceDelta: 450 },
    ],
  },
  {
    id: "shots",
    name: "Extra shot",
    minSelect: 0,
    maxSelect: 1,
    modifiers: [
      { id: "shot-none", name: "Sin extra", priceDelta: 0 },
      { id: "shot-one", name: "1 extra", priceDelta: 400 },
    ],
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "cafe-1",
    name: "Espresso",
    category: "Cafe",
    basePrice: 2100,
    modifierGroupIds: ["shots"],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "cafe-2",
    name: "Flat White",
    category: "Cafe",
    basePrice: 3400,
    modifierGroupIds: ["milk", "shots"],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "cafe-3",
    name: "Capuccino",
    category: "Cafe",
    basePrice: 3200,
    modifierGroupIds: ["milk", "shots"],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "past-1",
    name: "Medialuna",
    category: "Pasteleria",
    basePrice: 1800,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "past-2",
    name: "Brownie",
    category: "Pasteleria",
    basePrice: 2700,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "past-3",
    name: "Cheesecake",
    category: "Pasteleria",
    basePrice: 4600,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "past-4",
    name: "Masitas surtidas",
    category: "Pasteleria",
    basePrice: 9800,
    modifierGroupIds: [],
    isWeighable: true,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "combo-1",
    name: "Combo Desayuno",
    category: "Cafe",
    basePrice: 3600,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "bundle",
    bundleItems: [
      { productId: "cafe-1", qty: 1 },
      { productId: "past-1", qty: 1 },
    ],
    recipeItems: [],
  },
  {
    id: "ingr-1",
    name: "Cafe molido (kg)",
    category: "Cafe",
    basePrice: 0,
    modifierGroupIds: [],
    isWeighable: true,
    availableInPos: false,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "ingr-2",
    name: "Leche (L)",
    category: "Cafe",
    basePrice: 0,
    modifierGroupIds: [],
    isWeighable: true,
    availableInPos: false,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "fria-1",
    name: "Limonada",
    category: "Bebidas frias",
    basePrice: 2900,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "fria-2",
    name: "Cold Brew",
    category: "Bebidas frias",
    basePrice: 3500,
    modifierGroupIds: ["milk"],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
  {
    id: "fria-3",
    name: "Jugo Naranja",
    category: "Bebidas frias",
    basePrice: 3100,
    modifierGroupIds: [],
    isWeighable: false,
    availableInPos: true,
    kind: "single",
    bundleItems: [],
    recipeItems: [],
  },
];

DEFAULT_PRODUCTS.find((p) => p.id === "cafe-1")?.recipeItems.push(
  { ingredientProductId: "ingr-1", qty: 0.018 }
);
DEFAULT_PRODUCTS.find((p) => p.id === "cafe-2")?.recipeItems.push(
  { ingredientProductId: "ingr-1", qty: 0.018 },
  { ingredientProductId: "ingr-2", qty: 0.22 }
);
DEFAULT_PRODUCTS.find((p) => p.id === "cafe-3")?.recipeItems.push(
  { ingredientProductId: "ingr-1", qty: 0.018 },
  { ingredientProductId: "ingr-2", qty: 0.2 }
);
DEFAULT_PRODUCTS.find((p) => p.id === "fria-2")?.recipeItems.push(
  { ingredientProductId: "ingr-1", qty: 0.02 }
);
