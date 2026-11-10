// The VKB mess: a sample hostel-mess menu (not the real VKB menu) and the Pitstop extras counter.
// Prices are illustrative.

export const MEALS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

// One line per day; the menu repeats every four days.
export const MENU = {
  breakfast: ['Poha, bread-butter-jam, tea', 'Aloo paratha, curd, tea', 'Idli-sambar, cornflakes, milk', 'Upma, boiled eggs, coffee'],
  lunch: ['Dal, rice, roti, aloo-gobhi, curd', 'Rajma-chawal, roti, salad', 'Kadhi-pakoda, rice, roti, bhindi', 'Chole, rice, roti, raita'],
  dinner: ['Paneer butter masala, roti, dal, rice', 'Mix veg, roti, dal fry, rice, kheer', 'Egg curry or malai kofta, roti, rice', 'Dal baati churma, gatte ki sabzi'],
};

export const menuFor = (day) => Object.fromEntries(Object.keys(MEALS).map((m) => [m, MENU[m][day % MENU[m].length]]));

// What is in the four steel tubs on the serving counter, by meal (colours of the food).
export const COUNTER_FOOD = {
  breakfast: ['#e9c34a', '#f3ead2', '#8a5a2b', '#d9a441'], // poha, bread, tea, paratha
  lunch: ['#e3a33a', '#f7f4ea', '#d98a2b', '#f4f1e6'], // dal, rice, sabzi, curd
  dinner: ['#d9612e', '#e3a33a', '#f7f4ea', '#efe1bf'], // paneer, dal, rice, kheer
};

// Pitstop: extras you can buy any time the mess is open; they go on your mess bill.
export const PITSTOP = [
  { id: 'omelette', name: 'Omelette (2 eggs)', price: 30, emoji: '🍳' },
  { id: 'bread omelette', name: 'Bread omelette', price: 40, emoji: '🥪' },
  { id: 'maggi', name: 'Maggi', price: 35, emoji: '🍜' },
  { id: 'paneer paratha', name: 'Paneer paratha', price: 40, emoji: '🫓' },
  { id: 'cold coffee', name: 'Cold coffee', price: 40, emoji: '🧋' },
  { id: 'lassi', name: 'Lassi', price: 30, emoji: '🥛' },
  { id: 'gulab jamun', name: 'Gulab jamun (2)', price: 25, emoji: '🍡' },
  { id: 'cold drink', name: 'Cold drink', price: 40, emoji: '🥤' },
];
