// Small built-in skit used for the Studio preview and the web studio's starting point.
export const demoSkit = {
  name: "demo",
  world: "cart",
  world_options: { cartLabel: "BURGERS" },
  hook: { text: "Customers full… *space zero!*" },
  cast: [
    { id: "host", voice: "en-US-AndrewNeural", rate: "+10%", look: { style: "suit", hat: "none", outfit: "#1F3A5F", outfitDark: "#142740", tie: "#E53935", glasses: true, mustache: false } },
    { id: "chef", voice: "en-GB-RyanNeural", rate: "+8%", color: "#7CE0FF", look: { style: "chef", hat: "chef", outfit: "#FAFAFA", outfitDark: "#E0E0E0", skin: "#D9A27A" } },
  ],
  crowd: { chatter: ["Burger! Burger!", "Where's my order?", "One hour!"], cheer: ["Wow!", "Magic!", "Yay!"] },
  beats: [
    { pause: 1.6, scene: "wide", crowd: "excited", pose: { chef: { armAngle: -150, leftArmAngle: 150, jump: 12 } },
      bubbles: [{ text: "Burger! Burger!", x: 280, y: 1150 }, { text: "Where's my order?!", x: 800, y: 1180, tail: "right", delay: 0.4 }] },
    { say: "chef", text: "Oh no! So many customers, and my cart is tiny. Now it's raining too!", scene: "closeup:chef", rain: true, sfx: ["thunder"],
      pose: { chef: { armAngle: -150, leftArmAngle: 150 } } },
    { enter: "host", scene: "wide", rain: false, crowd: "cheer", bubbles: [{ text: "WOW! Magic!", x: 280, y: 1160 }] },
    { say: "host", text: "Relax, chef! I found you a real restaurant space.", crowd: "calm", pose: { host: { leftArmAngle: 95 } } },
    { dive: 0.6 },
    { say: "host", text: "Five hundred square feet, with a kitchen and dining area.", scene: "tour", shot: { title: "500 sq ft" }, sticker: "500 sq ft", pose: { host: { armAngle: -145 } } },
    { say: "chef", text: "And the rent?", shot: { title: "Rent?", bg: "#E53935" } },
    { say: "host", text: "Just sixty five thousand a month.", shot: { title: "Kitchen + Dining" }, card: { title: "RENT", value: "₹65,000", unit: "per month" } },
    { say: "chef", text: "Done! No more waiting for my customers!", shot: { title: "DEAL!" }, pose: { chef: { cheer: true, jump: 50 } }, confetti: true },
    { say: "host", text: "Want one too? Send us a message today.", cta: { line: "Message us", value: "@yourbrand", footer: "Free 2D reels with ToonReel" }, crowd: "cheer", pose: { host: { armAngle: -150 }, chef: { cheer: true, jump: 25 } } },
  ],
};
