/**
 * A slice of the real menu, frozen for the eval.
 *
 * Generated from docs/menu.json so the shapes are genuine, then committed so
 * the eval scores the same thing every run. A menu edit must not silently move
 * the numbers in the README.
 */
import type { OptionGroup, PricedMenuItem } from "../../src/lib/pricing.js";
import type { SearchableItem } from "../../src/assistant/menuSearch.js";

export const TEST_ITEMS: PricedMenuItem[] = [
  {
    "slug": "cheeseburger",
    "name": "Cheeseburger",
    "basePrice": 4.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "burger-size",
      "burger-remove",
      "burger-addons"
    ]
  },
  {
    "slug": "classic-hamburger",
    "name": "Classic Hamburger",
    "basePrice": 3.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "burger-size",
      "burger-remove",
      "burger-addons"
    ]
  },
  {
    "slug": "crispy-chicken-burger",
    "name": "Crispy Chicken Burger",
    "basePrice": 4.79,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "burger-remove",
      "burger-addons"
    ]
  },
  {
    "slug": "chicken-nuggets",
    "name": "Chicken Nuggets",
    "basePrice": 3.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "nugget-count",
      "dips"
    ]
  },
  {
    "slug": "fries",
    "name": "Fries",
    "basePrice": 1.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "fries-size",
      "dips"
    ]
  },
  {
    "slug": "curly-fries",
    "name": "Curly Fries",
    "basePrice": 2.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "fries-size",
      "dips"
    ]
  },
  {
    "slug": "onion-rings",
    "name": "Onion Rings",
    "basePrice": 2.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "dips"
    ]
  },
  {
    "slug": "side-salad",
    "name": "Side Salad",
    "basePrice": 2.29,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "salad-dressing"
    ]
  },
  {
    "slug": "cola",
    "name": "Cola",
    "basePrice": 1.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "drink-size"
    ]
  },
  {
    "slug": "lemonade",
    "name": "Lemonade",
    "basePrice": 1.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "drink-size"
    ]
  },
  {
    "slug": "bottled-water",
    "name": "Bottled Water",
    "basePrice": 1.19,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": []
  },
  {
    "slug": "milkshake",
    "name": "Milkshake",
    "basePrice": 3.29,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "shake-flavour",
      "shake-size"
    ]
  },
  {
    "slug": "coffee",
    "name": "Coffee",
    "basePrice": 1.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "coffee-milk",
      "hot-drink-size"
    ]
  },
  {
    "slug": "tea",
    "name": "Tea",
    "basePrice": 1.49,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "coffee-milk",
      "hot-drink-size"
    ]
  },
  {
    "slug": "cheeseburger-meal",
    "name": "Cheeseburger Meal",
    "basePrice": 7.29,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "burger-remove",
      "burger-addons",
      "meal-side",
      "meal-drink",
      "meal-upsize"
    ]
  },
  {
    "slug": "nugget-meal",
    "name": "Nugget Meal",
    "basePrice": 6.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "dips",
      "meal-side",
      "meal-drink",
      "meal-upsize"
    ]
  },
  {
    "slug": "family-bundle",
    "name": "Family Bundle",
    "basePrice": 24.99,
    "available": true,
    "maxQuantityPerOrder": 10,
    "optionGroups": [
      "family-bundle-choice"
    ]
  }
];

export const TEST_GROUPS: OptionGroup[] = [
  {
    "groupId": "burger-size",
    "name": "Size",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Single",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Double",
        "priceDelta": 1.8
      }
    ]
  },
  {
    "groupId": "fries-size",
    "name": "Size",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Small",
        "priceDelta": 0
      },
      {
        "name": "Medium",
        "priceDelta": 0.5,
        "default": true
      },
      {
        "name": "Large",
        "priceDelta": 1.0
      }
    ]
  },
  {
    "groupId": "drink-size",
    "name": "Size",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Regular",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Large",
        "priceDelta": 0.7
      }
    ]
  },
  {
    "groupId": "shake-size",
    "name": "Size",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Regular",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Large",
        "priceDelta": 0.8
      }
    ]
  },
  {
    "groupId": "hot-drink-size",
    "name": "Size",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Regular",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Large",
        "priceDelta": 0.6
      }
    ]
  },
  {
    "groupId": "nugget-count",
    "name": "How many",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "6 pieces",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "9 pieces",
        "priceDelta": 1.6
      },
      {
        "name": "15 pieces",
        "priceDelta": 4.2
      }
    ]
  },
  {
    "groupId": "burger-remove",
    "name": "Remove anything?",
    "min": 0,
    "max": 6,
    "options": [
      {
        "name": "No cheese",
        "priceDelta": 0.0
      },
      {
        "name": "No lettuce",
        "priceDelta": 0.0
      },
      {
        "name": "No tomato",
        "priceDelta": 0.0
      },
      {
        "name": "No onions",
        "priceDelta": 0.0
      },
      {
        "name": "No pickles",
        "priceDelta": 0.0
      },
      {
        "name": "No sauce",
        "priceDelta": 0.0
      }
    ]
  },
  {
    "groupId": "burger-addons",
    "name": "Add extras",
    "min": 0,
    "max": 5,
    "options": [
      {
        "name": "Extra cheese",
        "priceDelta": 0.6
      },
      {
        "name": "Turkey rasher",
        "priceDelta": 1.0
      },
      {
        "name": "Extra patty",
        "priceDelta": 1.8
      },
      {
        "name": "Jalapeños",
        "priceDelta": 0.4
      },
      {
        "name": "Fried egg",
        "priceDelta": 0.7
      }
    ]
  },
  {
    "groupId": "dips",
    "name": "Add a dip",
    "min": 0,
    "max": 3,
    "options": [
      {
        "name": "Garlic mayo",
        "priceDelta": 0.5
      },
      {
        "name": "BBQ",
        "priceDelta": 0.5
      },
      {
        "name": "Sweet chilli",
        "priceDelta": 0.5
      },
      {
        "name": "Ketchup",
        "priceDelta": 0.5
      },
      {
        "name": "Hot sauce",
        "priceDelta": 0.5
      }
    ]
  },
  {
    "groupId": "shake-flavour",
    "name": "Flavour",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Chocolate",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Strawberry",
        "priceDelta": 0
      },
      {
        "name": "Vanilla",
        "priceDelta": 0
      },
      {
        "name": "Salted caramel",
        "priceDelta": 0.4
      }
    ]
  },
  {
    "groupId": "coffee-milk",
    "name": "Milk",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Whole milk",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Semi-skimmed",
        "priceDelta": 0
      },
      {
        "name": "Oat milk",
        "priceDelta": 0.35
      },
      {
        "name": "Soya milk",
        "priceDelta": 0.35
      },
      {
        "name": "No milk",
        "priceDelta": 0
      }
    ]
  },
  {
    "groupId": "meal-side",
    "name": "Choose a side",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Regular fries",
        "priceDelta": 0,
        "linkedItem": "fries",
        "default": true
      },
      {
        "name": "Curly fries",
        "priceDelta": 0.6,
        "linkedItem": "curly-fries"
      },
      {
        "name": "Sweet potato fries",
        "priceDelta": 0.8,
        "linkedItem": "sweet-potato-fries"
      },
      {
        "name": "Onion rings",
        "priceDelta": 0.6,
        "linkedItem": "onion-rings"
      },
      {
        "name": "Side salad",
        "priceDelta": 0,
        "linkedItem": "side-salad"
      },
      {
        "name": "Coleslaw",
        "priceDelta": 0,
        "linkedItem": "coleslaw"
      }
    ]
  },
  {
    "groupId": "meal-drink",
    "name": "Choose a drink",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Cola",
        "priceDelta": 0,
        "linkedItem": "cola"
      },
      {
        "name": "Diet cola",
        "priceDelta": 0,
        "linkedItem": "diet-cola"
      },
      {
        "name": "Lemonade",
        "priceDelta": 0,
        "linkedItem": "lemonade"
      },
      {
        "name": "Orange juice",
        "priceDelta": 0.3,
        "linkedItem": "orange-juice"
      },
      {
        "name": "Bottled water",
        "priceDelta": 0,
        "linkedItem": "bottled-water"
      },
      {
        "name": "Milkshake",
        "priceDelta": 1.6,
        "linkedItem": "milkshake"
      }
    ]
  },
  {
    "groupId": "meal-upsize",
    "name": "Make it large?",
    "min": 0,
    "max": 1,
    "options": [
      {
        "name": "Large fries and drink",
        "priceDelta": 1.2
      }
    ]
  },
  {
    "groupId": "salad-dressing",
    "name": "Dressing",
    "min": 1,
    "max": 1,
    "options": [
      {
        "name": "Balsamic",
        "priceDelta": 0,
        "default": true
      },
      {
        "name": "Garlic mayo",
        "priceDelta": 0
      },
      {
        "name": "No dressing",
        "priceDelta": 0
      }
    ]
  },
  {
    "groupId": "family-bundle-choice",
    "name": "Choose 4 mains",
    "min": 4,
    "max": 4,
    "options": [
      {
        "name": "Cheeseburger",
        "priceDelta": 0,
        "linkedItem": "cheeseburger"
      },
      {
        "name": "Classic hamburger",
        "priceDelta": -0.4,
        "linkedItem": "classic-hamburger"
      },
      {
        "name": "Crispy chicken burger",
        "priceDelta": 0.3,
        "linkedItem": "crispy-chicken-burger"
      },
      {
        "name": "Spicy chicken burger",
        "priceDelta": 0.5,
        "linkedItem": "spicy-chicken-burger"
      },
      {
        "name": "Veggie burger",
        "priceDelta": 0,
        "linkedItem": "veggie-burger"
      }
    ]
  }
];

export const TEST_SEARCHABLE: SearchableItem[] = [
  {
    "slug": "cheeseburger",
    "name": "Cheeseburger",
    "aliases": [
      "cheese burger",
      "cheeseburgers",
      "burger with cheese",
      "cheesy burger"
    ],
    "description": "Beef patty, cheddar, lettuce, tomato, onions and pickles in a toasted bun.",
    "tags": [
      "halal",
      "bestseller"
    ],
    "category": "burgers",
    "available": true
  },
  {
    "slug": "classic-hamburger",
    "name": "Classic Hamburger",
    "aliases": [
      "hamburger",
      "plain burger",
      "beef burger",
      "normal burger"
    ],
    "description": "Beef patty, lettuce, tomato, onions and ketchup. No cheese, no fuss.",
    "tags": [
      "halal"
    ],
    "category": "burgers",
    "available": true
  },
  {
    "slug": "crispy-chicken-burger",
    "name": "Crispy Chicken Burger",
    "aliases": [
      "chicken burger",
      "crispy chicken",
      "chicken sandwich",
      "fried chicken burger"
    ],
    "description": "Buttermilk chicken fillet, lettuce and garlic mayo.",
    "tags": [
      "halal"
    ],
    "category": "burgers",
    "available": true
  },
  {
    "slug": "chicken-nuggets",
    "name": "Chicken Nuggets",
    "aliases": [
      "nuggets",
      "chicken nuggs",
      "nuggs",
      "chicken bites"
    ],
    "description": "Breaded chicken breast nuggets.",
    "tags": [
      "halal",
      "bestseller"
    ],
    "category": "chicken",
    "available": true
  },
  {
    "slug": "fries",
    "name": "Fries",
    "aliases": [
      "chips",
      "french fries",
      "reg fries",
      "side of chips"
    ],
    "description": "Skin-on fries, lightly salted.",
    "tags": [
      "vegan",
      "vegetarian",
      "bestseller"
    ],
    "category": "sides",
    "available": true
  },
  {
    "slug": "curly-fries",
    "name": "Curly Fries",
    "aliases": [
      "curly chips",
      "spiral fries",
      "twister fries"
    ],
    "description": "Seasoned spiral fries.",
    "tags": [
      "vegetarian"
    ],
    "category": "sides",
    "available": true
  },
  {
    "slug": "onion-rings",
    "name": "Onion Rings",
    "aliases": [
      "rings",
      "onion ring"
    ],
    "description": "Battered onion rings, six per portion.",
    "tags": [
      "vegetarian"
    ],
    "category": "sides",
    "available": true
  },
  {
    "slug": "side-salad",
    "name": "Side Salad",
    "aliases": [
      "salad",
      "green salad",
      "healthy side"
    ],
    "description": "Leaves, cucumber, tomato and red onion.",
    "tags": [
      "vegan",
      "vegetarian",
      "healthy"
    ],
    "category": "sides",
    "available": true
  },
  {
    "slug": "cola",
    "name": "Cola",
    "aliases": [
      "coke",
      "coca cola",
      "fizzy drink",
      "pop"
    ],
    "description": "Chilled cola over ice.",
    "tags": [
      "vegan"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "lemonade",
    "name": "Lemonade",
    "aliases": [
      "sprite",
      "7up",
      "lemon drink"
    ],
    "description": "Cloudy lemonade.",
    "tags": [
      "vegan"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "bottled-water",
    "name": "Bottled Water",
    "aliases": [
      "water",
      "still water",
      "bottle of water"
    ],
    "description": "Still bottled water.",
    "tags": [
      "vegan",
      "healthy"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "milkshake",
    "name": "Milkshake",
    "aliases": [
      "shake",
      "thick shake",
      "milk shake"
    ],
    "description": "Thick shake, blended to order.",
    "tags": [
      "vegetarian",
      "bestseller"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "coffee",
    "name": "Coffee",
    "aliases": [
      "americano",
      "black coffee",
      "hot coffee",
      "brew"
    ],
    "description": "Freshly brewed filter coffee.",
    "tags": [
      "vegan"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "tea",
    "name": "Tea",
    "aliases": [
      "cuppa",
      "english tea",
      "hot tea",
      "brew"
    ],
    "description": "English breakfast tea.",
    "tags": [
      "vegan"
    ],
    "category": "drinks",
    "available": true
  },
  {
    "slug": "cheeseburger-meal",
    "name": "Cheeseburger Meal",
    "aliases": [
      "cheeseburger combo",
      "burger meal",
      "cheeseburger and chips"
    ],
    "description": "Cheeseburger with a side and a drink.",
    "tags": [
      "halal",
      "bestseller"
    ],
    "category": "meals",
    "available": true
  },
  {
    "slug": "nugget-meal",
    "name": "Nugget Meal",
    "aliases": [
      "nuggets meal",
      "nugget combo"
    ],
    "description": "Six nuggets with a side, a drink and a dip.",
    "tags": [
      "halal"
    ],
    "category": "meals",
    "available": true
  },
  {
    "slug": "family-bundle",
    "name": "Family Bundle",
    "aliases": [
      "family meal",
      "family box",
      "bundle",
      "sharing box"
    ],
    "description": "Four mains, four regular fries, four drinks and a sharing side.",
    "tags": [
      "halal",
      "sharing"
    ],
    "category": "meals",
    "available": true
  }
];
