/* Licensed sample photos (Unsplash License — free, see public/samples/CREDITS.json).
 * They stand in for the demo catalogue until the store uploads its own product photos.
 * Every one is flagged `isSample` and labelled "Foto contoh" in the storefront.
 * Photos were hand-checked to avoid visible third-party brand logos. */

export const PRODUCT_PHOTOS: Record<string, string> = {
  "Court Classic Low": "/samples/court-classic.jpg",
  "Metro Runner 2": "/samples/runner.jpg",
  "Stride Lite": "/samples/runner.jpg",
  "Trail Edge GTX": "/samples/trail.jpg",
  "Canvas Everyday Slip-On": "/samples/slip-on.jpg",
  "Heritage Derby": "/samples/derby.jpg",
  "Cloud Strap Sandal": "/samples/strap-sandal.jpg",
  "Pool Slide Pro": "/samples/pool-slide.jpg",
  "Essential Heavyweight Tee": "/samples/tee-white.jpg",
  "Graphic Pocket Tee": "/samples/tee-hanger.jpg",
  "Piqué Club Polo": "/samples/polo.jpg",
  "Oxford Button-Down": "/samples/oxford-shirt.jpg",
  "Cloudfleece Hoodie": "/samples/hoodie.jpg",
  "Crewneck Sweatshirt": "/samples/sweatshirt.jpg",
  "Windshell Track Jacket": "/samples/track-jacket.jpg",
  "Utility Overshirt": "/samples/overshirt.jpg",
  "Tapered Chino": "/samples/chino.jpg",
  "Straight Selvedge Jeans": "/samples/jeans.jpg",
  'Court Shorts 7"': "/samples/shorts.jpg",
  "Dri Motion Training Tee": "/samples/tee-training.jpg",
  "Flex Studio Leggings": "/samples/leggings.jpg",
  "Commuter Backpack 22L": "/samples/backpack.jpg",
  "Trail Daypack 18L": "/samples/daypack.jpg",
  "Crossbody Sling": "/samples/sling.jpg",
  "Everyday Shoulder Bag": "/samples/shoulder-bag.jpg",
  "Market Canvas Tote": "/samples/tote.jpg",
  "Weekender Duffel 40L": "/samples/duffel.jpg",
  "Slim Bifold Wallet": "/samples/wallet.jpg",
  "Field Automatic 38mm": "/samples/watch-minimal.jpg",
  "Minimal Quartz 40mm": "/samples/watch-minimal.jpg",
  "Wayfarer Polarized": "/samples/sunglasses.jpg",
  "Six-Panel Cap": "/samples/cap.jpg",
  "Reversible Bucket Hat": "/samples/bucket-hat.jpg",
  "Leather Dress Belt": "/samples/belt.jpg",
  "Crew Sport Socks 3-Pack": "/samples/socks.jpg",
  "Beaded Charm Bracelet": "/samples/bracelet.jpg",
  "Insulated Bottle 750ml": "/samples/bottle.jpg",
  "Daily Tech Pouch": "/samples/pouch.jpg",
};

export const CATEGORY_PHOTOS: Record<string, string> = {
  shoes: "/samples/court-classic.jpg",
  clothing: "/samples/cat-clothing.jpg",
  bags: "/samples/backpack.jpg",
  accessories: "/samples/watch-minimal.jpg",
  lifestyle: "/samples/cat-lifestyle.jpg",
  sneakers: "/samples/court-classic.jpg",
  "running-shoes": "/samples/runner.jpg",
  "t-shirts": "/samples/tee-white.jpg",
  hoodies: "/samples/hoodie.jpg",
  jackets: "/samples/track-jacket.jpg",
  backpacks: "/samples/backpack.jpg",
  watches: "/samples/watch-minimal.jpg",
};

/** Promotions keyed by their type + order; also gives hero copy in sentence case (≤ 7 words). */
export const PROMO_UPDATES: { match: string; title?: string; image: string }[] = [
  { match: "FIND YOUR STYLE. DEFINE YOURSELF.", title: "Find your style, quietly.", image: "/samples/hero-wide-shoes.jpg" },
  { match: "STYLE THAT MOVES WITH YOU.", title: "Style that moves with you.", image: "/samples/hero-wide-apparel.jpg" },
  { match: "DISCOVER YOUR EVERYDAY ESSENTIALS.", title: "Everyday essentials, well made.", image: "/samples/hero-wide-bags.jpg" },
  { match: "Weekend Sale", image: "/samples/pool-slide.jpg" },
  { match: "Seasonal Collection", image: "/samples/overshirt.jpg" },
  { match: "New Collection", image: "/samples/cap.jpg" },
  { match: "Limited Deals", image: "/samples/watch-minimal.jpg" },
  { match: "Diskon 10% pesanan pertama", image: "/samples/court-classic.jpg" },
];
