import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOpenFoodFactsProduct } from "./open-food-facts";

test("normaliza apenas produtos com código de barras válido", () => {
  assert.equal(
    normalizeOpenFoodFactsProduct({ code: "not-a-barcode", product_name: "Produto" }),
    null,
  );
});

test("restringe imagens do Open Food Facts a hosts HTTPS permitidos", () => {
  const product = normalizeOpenFoodFactsProduct({
    code: "12345678",
    product_name: "Produto de teste",
    image_front_url: "https://example.com/unsafe.png",
    image_url: "https://images.openfoodfacts.org/images/products/12/34/12345678/front_en.400.jpg",
  });

  assert.equal(product?.imageUrl, "https://images.openfoodfacts.org/images/products/12/34/12345678/front_en.400.jpg");
  assert.equal(product?.ingredient.searchName, "produto de teste");
});
