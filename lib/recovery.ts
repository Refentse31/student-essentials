// Recovery passphrase helpers (client-safe).
const WORDS = [
  "amber","anchor","apple","arrow","aspen","atlas","autumn","basil","beacon","birch",
  "bishop","bloom","bramble","branch","bridge","bright","bronze","brook","cactus","canyon",
  "cedar","cinder","citrus","clover","cobalt","comet","copper","coral","cosmic","cotton",
  "crane","crystal","dahlia","daisy","dawn","delta","denim","desert","diamond","domino",
  "dune","eagle","ember","emerald","falcon","fern","flint","forest","fossil","garnet",
  "gecko","ginger","glacier","granite","harbor","harvest","hazel","heron","hollow","indigo",
  "island","ivory","jasper","jungle","juniper","kettle","lagoon","lantern","laurel","ledger",
  "lemon","lilac","linen","lotus","lumen","maple","marble","meadow","mellow","meteor",
  "mint","monsoon","moss","nebula","nectar","nimbus","noble","north","oasis","olive",
  "onyx","opal","orbit","orchid","otter","oxide","pebble","pepper","pilot","pine",
  "pixel","plaza","pollen","poplar","prairie","prism","pumpkin","quartz","quiver","raven",
  "reef","ridge","river","rocket","rustic","saffron","sage","salmon","sandy","sapphire",
  "shadow","shale","shore","silver","slate","solar","sparrow","spruce","stellar","stone",
  "summit","sunset","swift","tandem","teal","temple","thistle","thunder","tiger","timber",
  "topaz","torch","trail","tulip","tundra","umber","valley","velvet","vertex","violet",
  "walnut","willow","winter","wombat","zephyr","zenith",
];

export function generateRecoveryPhrase(): string {
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => WORDS[n % WORDS.length]).join(" ");
}

export function normalizePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).join(" ");
}
