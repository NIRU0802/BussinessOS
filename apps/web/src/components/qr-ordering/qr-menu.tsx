"use client";

import { useMemo, useState } from "react";

interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: ModifierOption[];
}

interface MenuItemVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  effectivePrice: number;
  isAvailable: boolean;
  isVegetarian?: boolean;
  variants: MenuItemVariant[];
  modifierGroups: ModifierGroup[];
}

interface CartLine {
  key: string;
  productId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  modifierOptionIds: string[];
  modifierNames: string[];
  quantity: number;
  unitPrice: number;
}

interface OrderResult {
  id: string;
}

interface QrMenuProps {
  items: MenuItem[];
  onPlaceOrder: (
    items: {
      productId: string;
      variantId?: string;
      modifierOptionIds?: string[];
      quantity: number;
    }[],
  ) => Promise<OrderResult>;
}

export function QrMenu({ items, onPlaceOrder }: QrMenuProps) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const availableItems = useMemo(() => items.filter((i) => i.isAvailable), [items]);

  const addToCart = (
    item: MenuItem,
    variant?: MenuItemVariant,
    selectedOptions: ModifierOption[] = [],
  ) => {
    const unitPrice =
      item.effectivePrice +
      (variant?.priceDelta ?? 0) +
      selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0);

    const key = [item.id, variant?.id ?? "", ...selectedOptions.map((o) => o.id).sort()].join("|");

    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: item.id,
          name: item.name,
          variantId: variant?.id,
          variantName: variant?.name,
          modifierOptionIds: selectedOptions.map((o) => o.id),
          modifierNames: selectedOptions.map((o) => o.name),
          quantity: 1,
          unitPrice,
        },
      ];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      const result = await onPlaceOrder(
        cart.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          modifierOptionIds: line.modifierOptionIds.length ? line.modifierOptionIds : undefined,
          quantity: line.quantity,
        })),
      );
      setConfirmedOrderId(result.id);
      setCart([]);
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "Could not place your order.");
    } finally {
      setPlacing(false);
    }
  };

  if (confirmedOrderId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-lg font-semibold">Order placed!</p>
          <p className="text-sm text-neutral-500">
            Your order has been sent to the kitchen. A staff member will bring it to your table
            shortly.
          </p>
          <button
            className="mt-4 text-sm underline text-neutral-500"
            onClick={() => setConfirmedOrderId(null)}
          >
            Order more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <div className="flex-1 divide-y divide-neutral-200 dark:divide-neutral-800">
        {availableItems.map((item) => (
          <MenuItemRow key={item.id} item={item} onAdd={addToCart} />
        ))}
        {availableItems.length === 0 && (
          <p className="p-6 text-center text-sm text-neutral-500">
            No items are currently available at this branch.
          </p>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 space-y-3">
          {placeError && <p className="text-sm text-red-600">{placeError}</p>}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {cart.map((line) => (
              <div key={line.key} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {line.name}
                  {line.variantName ? ` (${line.variantName})` : ""}
                  {line.modifierNames.length ? ` + ${line.modifierNames.join(", ")}` : ""}
                </span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700"
                    onClick={() => updateQuantity(line.key, -1)}
                  >
                    -
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700"
                    onClick={() => updateQuantity(line.key, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3 font-medium disabled:opacity-50"
            disabled={placing}
            onClick={handlePlaceOrder}
          >
            {placing
              ? "Placing order..."
              : `Place order - ${itemCount} item${itemCount === 1 ? "" : "s"} - $${total.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItemRow({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem, variant?: MenuItemVariant, options?: ModifierOption[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(
    item.variants[0],
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());

  const hasOptions = item.variants.length > 0 || item.modifierGroups.length > 0;

  const toggleOption = (option: ModifierOption, group: ModifierGroup) => {
    setSelectedOptionIds((prev) => {
      const next = new Set(prev);
      if (group.maxSelect <= 1) {
        for (const o of group.options) next.delete(o.id);
        if (!prev.has(option.id)) next.add(option.id);
      } else {
        if (next.has(option.id)) next.delete(option.id);
        else next.add(option.id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const allOptions = item.modifierGroups.flatMap((g) => g.options);
    const selectedOptions = allOptions.filter((o) => selectedOptionIds.has(o.id));
    onAdd(item, selectedVariant, selectedOptions);
    setExpanded(false);
    setSelectedOptionIds(new Set());
  };

  return (
    <div className="p-4">
      <button
        className="w-full flex items-start justify-between gap-4 text-left"
        onClick={() => (hasOptions ? setExpanded((e) => !e) : onAdd(item))}
      >
        <div>
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-sm text-neutral-500 mt-0.5">{item.description}</p>
          )}
          <p className="text-sm text-neutral-500 mt-1">${item.effectivePrice.toFixed(2)}</p>
        </div>
        <span className="shrink-0 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-full w-8 h-8 flex items-center justify-center">
          +
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
          {item.variants.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Choose an option</p>
              <div className="space-y-1.5">
                {item.variants.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`variant-${item.id}`}
                      checked={selectedVariant?.id === v.id}
                      onChange={() => setSelectedVariant(v)}
                    />
                    {v.name}
                    {v.priceDelta !== 0 &&
                      ` (${v.priceDelta > 0 ? "+" : ""}$${v.priceDelta.toFixed(2)})`}
                  </label>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups.map((group) => (
            <div key={group.id}>
              <p className="text-sm font-medium mb-2">
                {group.name}
                {group.isRequired && <span className="text-red-500"> *</span>}
              </p>
              <div className="space-y-1.5">
                {group.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={group.maxSelect <= 1 ? "radio" : "checkbox"}
                      name={`group-${group.id}`}
                      checked={selectedOptionIds.has(option.id)}
                      onChange={() => toggleOption(option, group)}
                    />
                    {option.name}
                    {option.priceDelta !== 0 &&
                      ` (${option.priceDelta > 0 ? "+" : ""}$${option.priceDelta.toFixed(2)})`}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-2.5 text-sm font-medium"
            onClick={handleAdd}
          >
            Add to order
          </button>
        </div>
      )}
    </div>
  );
}
