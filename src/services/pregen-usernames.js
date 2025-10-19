import admin from "./FirebaseAdmin.js";


const db = admin.firestore();
const BATCH_SIZE = 500;

const verbs = [
  "running", "walking", "sleeping", "drinking", "flying", "jumping", "dancing",
  "singing", "swimming", "climbing", "reading", "writing", "painting", "cooking",
  "driving", "sailing", "skating", "skiing", "surfing", "diving", "hiking",
  "camping", "fishing", "hunting", "exploring", "racing", "spinning", "rolling",
  "bouncing", "gliding", "soaring", "drifting", "floating", "sliding", "hopping",
  "skipping", "jogging", "sprinting", "crawling", "leaping", "vaulting", "tumbling",
  "twirling", "swaying", "rocking", "wobbling", "shaking", "wiggling", "stretching",
  "laughing", "crying", "shouting", "whispering", "wandering", "marching", "strutting",
  "tiptoeing", "balancing", "cartwheeling", "somersaulting", "backflipping", "handstanding", "lunging",
  "kneeling", "crouching", "bending", "reaching", "grasping", "throwing", "catching",
  "kicking", "punching", "dodging", "weaving", "ducking", "pivoting", "circling",
  "meandering", "strolling", "trudging", "shuffling", "stomping", "tapping", "clapping",
  "snapping", "waving", "pointing", "gesturing", "nodding", "bowing", "curtseying",
  "twisting", "turning", "flipping", "rotating", "revolving", "spiraling", "looping"
];

const nouns = [
  "sea", "dolphin", "tree", "mountain", "river", "eagle", "lion", "tiger",
  "bear", "wolf", "fox", "deer", "rabbit", "squirrel", "bird", "fish",
  "star", "moon", "sun", "cloud", "wind", "rain", "snow", "thunder",
  "ocean", "lake", "forest", "desert", "canyon", "valley", "hill", "peak",
  "flame", "wave", "stone", "crystal", "shadow", "light", "dream", "spirit",
  "phoenix", "dragon", "unicorn", "griffin", "panther", "falcon", "raven", "hawk",
  "storm", "blaze", "comet", "galaxy", "nebula", "meteor", "aurora", "eclipse",
  "glacier", "volcano", "geyser", "waterfall", "cascade", "rapids", "tide", "current",
  "meadow", "prairie", "tundra", "savanna", "jungle", "reef", "island", "peninsula",
  "horizon", "twilight", "dawn", "dusk", "midnight", "sunrise", "sunset", "rainbow",
  "lightning", "tornado", "hurricane", "avalanche", "earthquake", "tsunami", "cyclone", "tempest",
  "leopard", "cheetah", "jaguar", "cougar", "lynx", "otter", "seal", "whale",
  "shark", "cobra", "viper", "python", "sparrow", "owl", "crane", "heron",
  "sphinx", "pegasus", "hydra", "kraken", "leviathan", "basilisk", "chimera", "manticore"
];


const TARGET = 500; // how many usernames to generate

function makeSlug(v, n, num) {
  return `${v}${n}${num}`; // no spaces;
}

async function generateUniqueNames(target) {
  const set = new Set();
  while (set.size < target) {
    const v = verbs[Math.floor(Math.random()*verbs.length)];
    const n = nouns[Math.floor(Math.random()*nouns.length)];
    const num = Math.floor(Math.random()*10000); // 0 - 9999
    set.add(makeSlug(v, n, num));
  }
  return Array.from(set);
}

async function upload(names) {
  let batch = db.batch();
  let ops = 0;
  for (let i=0;i<names.length;i++) {
    const id = names[i];
    const ref = db.collection("usernames").doc(id);
    batch.set(ref, {
      assignedTo: null,
      assignedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "pregen-script"
    });
    ops++;
    if (ops === BATCH_SIZE || i === names.length - 1) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`Committed batch up to index ${i}`);
    }
  }
}
const isDry = process.argv.includes("--dry");
(async () => {
  const names = await generateUniqueNames(TARGET);
  console.log("Generated ", names.length, " usernames.");
  console.log("Sample 100 usernames:", names.slice(0, 100).join(", "));
  
  if (!isDry) {
    console.log("Uploading to Firestore...");
    await upload(names);
  }
  console.log("Done!");
  process.exit(0);
})();
