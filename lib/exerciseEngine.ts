/**
 * PoseTracker exercise list for the demo.
 * Ids match the public catalog (WebView `exercise=` and SDK `startExercise`).
 * French labels are search aliases for this demo — the product catalog is English.
 */

export type MovementType = "dynamic" | "static";

export interface ExerciseInfo {
  key: string;
  name: string;
  nameFr: string;
  search: string[];
  movement_type: MovementType;
  type: "base" | "custom";
}

const EXERCISES: ExerciseInfo[] = [
  { key: "squat", name: "Squat", nameFr: "Squat", search: ["flexion", "accroupissement"], movement_type: "dynamic", type: "base" },
  { key: "push_up", name: "Push-up", nameFr: "Pompe", search: ["pompe", "pompes"], movement_type: "dynamic", type: "base" },
  { key: "lunge", name: "Lunge", nameFr: "Fente", search: ["fente", "fentes"], movement_type: "dynamic", type: "base" },
  { key: "side_lunge", name: "Side lunge", nameFr: "Fente latérale", search: ["fente laterale"], movement_type: "dynamic", type: "base" },
  { key: "deadlift", name: "Deadlift", nameFr: "Soulevé de terre", search: ["souleve", "terre"], movement_type: "dynamic", type: "base" },
  { key: "bicep_curl", name: "Bicep curl", nameFr: "Curl biceps", search: ["biceps", "curl"], movement_type: "dynamic", type: "base" },
  { key: "hammer_curl", name: "Hammer curl", nameFr: "Curl marteau", search: ["marteau"], movement_type: "dynamic", type: "base" },
  { key: "tricep_dip", name: "Tricep dip", nameFr: "Dips", search: ["dips", "triceps"], movement_type: "dynamic", type: "base" },
  { key: "shoulder_press", name: "Shoulder press", nameFr: "Développé épaules", search: ["developpe", "epaules", "militaire"], movement_type: "dynamic", type: "base" },
  { key: "lateral_raise", name: "Lateral raise", nameFr: "Élévation latérale", search: ["elevation", "laterale"], movement_type: "dynamic", type: "base" },
  { key: "glute_bridge", name: "Glute bridge", nameFr: "Pont fessier", search: ["fessier", "hanches"], movement_type: "dynamic", type: "base" },
  { key: "calf_raise", name: "Calf raise", nameFr: "Mollets", search: ["mollet", "mollets"], movement_type: "dynamic", type: "base" },
  { key: "mountain_climber", name: "Mountain climber", nameFr: "Mountain climber", search: ["grimpeur"], movement_type: "dynamic", type: "base" },
  { key: "high_knees", name: "High knees", nameFr: "Montées de genoux", search: ["genoux", "montees"], movement_type: "dynamic", type: "base" },
  { key: "jumping_jack", name: "Jumping jack", nameFr: "Jumping jack", search: ["jack"], movement_type: "dynamic", type: "base" },
  { key: "low_impact_jack", name: "Low-impact jack", nameFr: "Jumping jack doux", search: ["low impact"], movement_type: "dynamic", type: "base" },
  { key: "leg_raise", name: "Leg raise", nameFr: "Relevé de jambes", search: ["jambes", "releve"], movement_type: "dynamic", type: "base" },

  { key: "plank", name: "Plank", nameFr: "Planche", search: ["gainage", "planche"], movement_type: "static", type: "base" },
  { key: "wall_sit", name: "Wall sit", nameFr: "Chaise", search: ["chaise", "mur"], movement_type: "static", type: "base" },
  { key: "balance_leg", name: "Balance (single leg)", nameFr: "Équilibre une jambe", search: ["equilibre", "jambe"], movement_type: "static", type: "base" },
  { key: "balance_leg_left", name: "Balance (left leg)", nameFr: "Équilibre jambe gauche", search: ["equilibre", "gauche"], movement_type: "static", type: "base" },
  { key: "balance_leg_right", name: "Balance (right leg)", nameFr: "Équilibre jambe droite", search: ["equilibre", "droite"], movement_type: "static", type: "base" },

  { key: "shoulder_roll", name: "Shoulder roll", nameFr: "Roulement d'épaules", search: ["epaules", "roulement", "cercle"], movement_type: "dynamic", type: "base" },
  { key: "shoulder_deep_breath", name: "Shoulder deep breath", nameFr: "Respiration épaules", search: ["respiration", "souffle"], movement_type: "dynamic", type: "base" },
  { key: "chair_forward_fold", name: "Chair forward fold", nameFr: "Flexion assise", search: ["chaise", "flexion", "dos"], movement_type: "static", type: "base" },
  { key: "chair_side_stretch", name: "Chair side stretch", nameFr: "Étirement latéral assis", search: ["chaise", "etirement", "cote"], movement_type: "static", type: "base" },
  { key: "split", name: "Front split", nameFr: "Grand écart", search: ["ecart", "split"], movement_type: "static", type: "base" },
  { key: "facial_split", name: "Middle split", nameFr: "Grand écart facial", search: ["ecart", "facial"], movement_type: "static", type: "base" },
  { key: "pancake", name: "Pancake", nameFr: "Pancake", search: ["souplesse", "hanches"], movement_type: "static", type: "base" },
  { key: "closing", name: "Pike / closing", nameFr: "Pike", search: ["fermeture", "pike"], movement_type: "static", type: "base" },
  { key: "bridge", name: "Bridge", nameFr: "Pont", search: ["pont", "dos"], movement_type: "static", type: "base" },
  { key: "cobra", name: "Cobra", nameFr: "Cobra", search: ["cobra", "yoga"], movement_type: "static", type: "base" },
  { key: "bow", name: "Bow", nameFr: "Arc", search: ["arc", "yoga"], movement_type: "static", type: "base" },
  { key: "tiger", name: "Tiger pose", nameFr: "Tigre", search: ["tigre", "yoga"], movement_type: "static", type: "base" },
  { key: "camel", name: "Camel", nameFr: "Chameau", search: ["chameau", "yoga"], movement_type: "static", type: "base" },
  { key: "king_pigeon", name: "King pigeon", nameFr: "Pigeon royal", search: ["pigeon", "yoga"], movement_type: "static", type: "base" },
  { key: "foot_to_hand", name: "Foot to hand", nameFr: "Pied à la main", search: ["pied", "main"], movement_type: "static", type: "base" },
  { key: "i", name: "Standing I", nameFr: "Posture I", search: ["i", "debout"], movement_type: "static", type: "base" },
  { key: "needle", name: "Needle", nameFr: "Aiguille", search: ["aiguille"], movement_type: "static", type: "base" },

  { key: "back_flexibility_test", name: "Back flexibility test", nameFr: "Souplesse du dos", search: ["souplesse", "dos", "test"], movement_type: "dynamic", type: "base" },

  { key: "jump_analysis", name: "Jump analysis", nameFr: "Analyse de saut", search: ["saut", "hauteur"], movement_type: "dynamic", type: "custom" },
  { key: "air_time_jump", name: "Air-time jump", nameFr: "Saut temps de vol", search: ["saut", "air", "jump"], movement_type: "dynamic", type: "custom" },
];

export function listExercises(): string[] {
  return EXERCISES.map((ex) => ex.key);
}

export function getExerciseInfo(key: string): ExerciseInfo | null {
  return EXERCISES.find((ex) => ex.key === key) ?? null;
}

export function allExercises(): ExerciseInfo[] {
  return EXERCISES;
}

export function foldSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterExercises(list: ExerciseInfo[], query: string): ExerciseInfo[] {
  const q = foldSearch(query.trim());
  if (!q) return list;
  return list.filter((ex) => {
    const blob = foldSearch([ex.key, ex.name, ex.nameFr, ex.search.join(" ")].join(" "));
    return blob.includes(q);
  });
}
