/** Fun product emoji by name — makes catalogs friendlier across the app. */
export const productEmoji = (name: string): string => {
  const n = (name || '').toLowerCase();
  // Vegetables & fruits
  if (/tomato/.test(n)) return '🍅';
  if (/onion/.test(n)) return '🧅';
  if (/potato|aloo|batata/.test(n)) return '🥔';
  if (/carrot/.test(n)) return '🥕';
  if (/apple/.test(n)) return '🍎';
  if (/banana/.test(n)) return '🍌';
  if (/mango/.test(n)) return '🥭';
  if (/orange/.test(n)) return '🍊';
  if (/lemon|lime/.test(n)) return '🍋';
  if (/grape/.test(n)) return '🍇';
  if (/watermelon/.test(n)) return '🍉';
  if (/papaya/.test(n)) return '🧡';
  if (/pomegranate|anar|dalimba/.test(n)) return '🍎';
  if (/guava/.test(n)) return '🍐';
  if (/coconut/.test(n)) return '🥥';
  if (/chilli|chili|pepper powder|menasina/.test(n) && !/black pepper|kali mirch|kari menasu/.test(n)) return '🌶️';
  if (/coriander|mint|leaf|palak|spinach|methi|greens/.test(n)) return '🌿';
  if (/cabbage|cauliflower|gobi|kosu|hookosu/.test(n)) return '🥬';
  if (/brinjal|eggplant/.test(n)) return '🍆';
  if (/cucumber|sautekayi/.test(n)) return '🥒';
  if (/garlic|belluli/.test(n)) return '🧄';
  if (/ginger|shunti/.test(n)) return '🫚';
  if (/beet/.test(n)) return '🍠';
  if (/bhindi|okra|bende/.test(n)) return '🌿';
  if (/flower|rose|jasmine|mallige/.test(n)) return '🌸';
  // Spices & masala
  if (/turmeric|arishina/.test(n)) return '🟡';
  if (/black pepper|kali mirch|kari menasu/.test(n)) return '⚫';
  if (/cardamom|elaichi|elakkai/.test(n)) return '🫧';
  if (/cumin|jeera|jeerige/.test(n)) return '🫘';
  if (/mustard|sasive|rai/.test(n)) return '🟤';
  if (/coriander seed|dhania/.test(n)) return '🟤';
  if (/masala|sambar|rasam|bisi bele|garam/.test(n)) return '🍲';
  // Staples: rice, dal, atta, oil, sugar
  if (/rice|akki|basmati|sona/.test(n)) return '🍚';
  if (/dal|toor|urad|chana|togari|uddina|kadale|besle/.test(n)) return '🫘';
  if (/atta|maida|flour|godhi|hittu|rava|suji/.test(n)) return '🌾';
  if (/oil|enne/.test(n)) return '🫗';
  if (/sugar|sakre|khand|salt|uppu/.test(n)) return '🧂';
  if (/tamarind|hunase/.test(n)) return '🟫';
  // Dairy & eggs
  if (/milk|halu/.test(n)) return '🥛';
  if (/curd|yogurt|mosaru/.test(n)) return '🍦';
  if (/ghee|tuppa|butter/.test(n)) return '🧈';
  if (/egg|motte|anda/.test(n)) return '🥚';
  if (/paneer|cheese/.test(n)) return '🧀';
  return '🛒';
};

/** Emoji for a vendor business category. */
export const vendorEmoji = (category: string): string => {
  const c = (category || '').toLowerCase();
  if (/veg/.test(c)) return '🥬';
  if (/fruit/.test(c)) return '🍎';
  if (/flower/.test(c)) return '🌸';
  if (/dairy|milk/.test(c)) return '🥛';
  if (/fish|meat/.test(c)) return '🐟';
  if (/spice/.test(c)) return '🌶️';
  if (/staple|rice|dal|atta|grain/.test(c)) return '🌾';
  if (/grocer|kirana|general/.test(c)) return '🛒';
  if (/snack|fast ?food|chaat/.test(c)) return '🍽️';
  if (/tea|coffee|beverage|juice/.test(c)) return '☕';
  return '🛒';
};

/** Emoji for a category name (used on filter chips). */
export const categoryEmoji = (categoryName: string): string => vendorEmoji(categoryName);

/**
 * Short storefront filter label for a product category name.
 * Full category names like "Spices & Staples" or "Rice, Dal & Atta" collapse
 * to chip-friendly labels; unknown categories pass through unchanged.
 */
export const storefrontFilterLabel = (categoryName: string): string => {
  const c = (categoryName || '').toLowerCase();
  if (/spice|masala/.test(c)) return 'Spices';
  if (/staple|rice|dal|atta|grain/.test(c)) return 'Staples';
  if (/dairy|milk|egg/.test(c)) return 'Dairy';
  if (/veg/.test(c)) return 'Vegetables';
  if (/fruit/.test(c)) return 'Fruits';
  if (/snack|fast ?food|chaat/.test(c)) return 'Snacks';
  if (/beverage|tea|coffee|juice/.test(c)) return 'Beverages';
  if (/grocer|kirana|general/.test(c)) return 'Groceries';
  return categoryName || 'Other';
};

/**
 * Build the ordered storefront filter list from a product list.
 * Returns chips in first-seen order so popular categories surface first.
 */
export const buildStorefrontFilters = (products: { category_name?: string | null }[]): string[] => {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const p of products) {
    if (!p.category_name) continue;
    const label = storefrontFilterLabel(p.category_name);
    if (!seen.has(label)) {
      seen.add(label);
      chips.push(label);
    }
  }
  return chips;
};
