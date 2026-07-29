const CHEMICAL_BOTTLE_BASE_PATH = "./images/products/chemical/lab-bottle-base.png";

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizedText(value = "") {
  return String(value || "").trim();
}

function isTechnicalByCategory(category = "") {
  const value = String(category || "").toLowerCase();
  return /(techn|pump|ersatz|zubeh|maschine|equipment)/.test(value);
}

function bottleNameClass(displayName = "") {
  const len = displayName.length;
  if (len > 44) return "name-xl";
  if (len > 30) return "name-lg";
  if (len > 20) return "name-md";
  return "name-sm";
}

export function getProductDisplayName(product = {}) {
  return normalizedText(product.displayName) || normalizedText(product.name) || normalizedText(product.productName) || "Produkt";
}

export function isChemicalProduct(product = {}) {
  const type = normalizedText(product.productType).toLowerCase();
  if (type === "chemical") return true;
  if (type === "technical") return false;

  const category = normalizedText(product.category).toLowerCase();
  if (!category) return false;
  if (isTechnicalByCategory(category)) return false;
  return /(chem|f[aä]ll|flock|bio|polymer|coagul|precip|reaktiv)/.test(category);
}

export function getProductImageStrategy(product = {}) {
  const imageUrl = normalizedText(product.imageUrl || product.productImageUrl);
  if (imageUrl) return "custom";
  if (isChemicalProduct(product)) return "chemical-bottle";
  return "placeholder";
}

export function getProductImageAltText(product = {}) {
  const displayName = getProductDisplayName(product);
  const strategy = getProductImageStrategy(product);

  if (strategy === "custom") {
    return normalizedText(product.imageAltText) || `${displayName} Produktbild`;
  }
  if (strategy === "chemical-bottle") {
    return `Weiße 100-ml-Laborflasche für ${displayName}`;
  }
  return normalizedText(product.imageAltText) || `Platzhalterbild für ${displayName}`;
}

export function renderProductImage(product = {}, options = {}) {
  const strategy = getProductImageStrategy(product);
  const displayName = getProductDisplayName(product);
  const altText = getProductImageAltText(product);
  const className = normalizedText(options.className);
  const contextClass = normalizedText(options.contextClass);
  const classes = ["product-image-render", contextClass, className].filter(Boolean).join(" ");

  if (strategy === "custom") {
    const src = normalizedText(product.imageUrl || product.productImageUrl);
    return `<img class="product-image-media ${classes}" src="${esc(src)}" alt="${esc(altText)}" loading="lazy">`;
  }

  if (strategy === "chemical-bottle") {
    const nameClass = bottleNameClass(displayName);
    return `<div class="product-image-chemical-bottle ${classes}" role="img" aria-label="${esc(altText)}">`
      + `<img class="product-image-bottle-base" src="${esc(CHEMICAL_BOTTLE_BASE_PATH)}" alt="" aria-hidden="true" loading="lazy" onerror="this.remove()">`
      + `<span class="product-image-bottle-label ${nameClass}">${esc(displayName)}</span>`
      + `</div>`;
  }

  return `<div class="product-image-placeholder ${classes}" role="img" aria-label="${esc(altText)}"><span>${esc(displayName)}</span></div>`;
}

export { CHEMICAL_BOTTLE_BASE_PATH };
