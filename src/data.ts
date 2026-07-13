export type CellType = "animal" | "plant";

/** A custom annotation: a numbered pin at a 3D point (model-centered coords) + info text. */
export interface Annotation {
  title: string;
  desc: string;
  pos: [number, number, number];
  /** Optional illustration shown in the info panel. */
  img?: string;
}

/** An extra organelle we add on top of the downloaded model (not present in it). */
export interface ExtraOrganelle {
  id: string;
  label: string;
  color: number;
  /** "sphere" | "capsule" — simple primitive; extend as needed. */
  shape: "sphere" | "capsule";
  size: number;
  pos: [number, number, number];
}

export const MODELS: Record<CellType, {
  url: string; title: string; author: string; authorUrl: string; modelUrl: string;
}> = {
  animal: {
    url: "/models/animal.glb",
    title: "Animal cell 2.0 — annotated in English",
    author: "montanna",
    authorUrl: "https://sketchfab.com/montanna",
    modelUrl: "https://sketchfab.com/3d-models/animal-cell-20-annotated-in-english-0d9f7f4257224975b2ef83a283709b2f",
  },
  plant: {
    url: "/models/plant.glb",
    title: "Plant Cell Organelles",
    author: "CVallance",
    authorUrl: "https://sketchfab.com/cvallance01",
    modelUrl: "https://sketchfab.com/3d-models/plant-cell-organelles-e61e7bdf8c8449a583b364f05e70289b",
  },
};

/**
 * Custom annotation pins. Positions are in MODEL-CENTERED coordinates
 * (the loader centers each model at the origin and normalizes its size to
 * roughly a radius of 10).
 *
 * The `pos` values below are PLACEHOLDERS — a rough spread so every pin is
 * visible. To land each pin on its real organelle: turn on "Place-pin mode"
 * (bottom-right panel), click the organelle, copy the printed [x, y, z], and
 * replace that annotation's `pos`.
 */
export const ANNOTATIONS: Record<CellType, Annotation[]> = {
  animal: [
    {
      title: "Nucleus",
      desc: "The cell's control center. Enclosed by a double membrane (the nuclear envelope), it houses the DNA and directs all cellular activities — growth, metabolism, and reproduction — by controlling which genes are expressed.",
      pos: [-1.4, 2.16, -1.73],
    },
    {
      title: "Nucleolus",
      desc: "The largest structure in the nucleus. It primarily serves as the site of ribosome synthesis and assembly.",
      pos: [-0.27, 2.7, -1.56],
    },
    {
      title: "Cell (Plasma) Membrane",
      desc: "The Plasma membrane is a thin, flexible layer that surrounds the cell and separates it from its surroundings. Its main job is to protect the cell and control what enters and leaves the cell, such as nutrients, water, oxygen, and waste materials. By allowing only certain substances to pass through, the cell membrane helps maintain a stable environment inside the cell so it can function properly.",
      pos: [2.51, 1.64, 6],
    },
    {
      title: "Cytoplasm",
      desc: "The Cytoplasm is a jelly-like substance that fills the inside of the cell and surrounds all the organelles. It helps hold the organelles in place while allowing them to move when needed. The cytoplasm is also where many important chemical reactions take place, such as breaking down nutrients to release energy and producing substances the cell needs to survive and function properly.",
      pos: [-4.37, 1.7, -3.34],
    },
    {
      title: "Mitochondrion",
      desc: "The 'powerhouse' of the cell. Through aerobic respiration it breaks down glucose to produce ATP, the cell's main energy currency. Its inner membrane folds (cristae) increase surface area for these reactions.",
      pos: [0.04, 1.95, 5.89],
    },
    {
      title: "Rough Endoplasmic Reticulum",
      desc: "A network of membranes studded with ribosomes, giving it a 'rough' look. It synthesizes and folds proteins destined for secretion or for the cell membrane.",
      pos: [-0.9, 1.86, 1.47],
    },
    {
      title: "Smooth Endoplasmic Reticulum",
      desc: "A membrane network without ribosomes. It synthesizes lipids and steroids, processes carbohydrates, and helps detoxify drugs and other harmful substances.",
      pos: [-2.65, 2, 3.15],
    },
    {
      title: "Golgi Apparatus",
      desc: "A stack of flattened membrane sacs that modifies, sorts, and packages proteins and lipids from the ER into vesicles for delivery inside or outside the cell.",
      pos: [3.07, 1.79, 2.65],
    },
    {
      title: "Ribosomes",
      desc: "Ribosomes are tiny structures inside the cell that make proteins, which are needed for growth, repair, and many cell activities. They can be found floating freely in the cytoplasm or attached to the rough endoplasmic reticulum.",
      pos: [1.48, 1.84, 1.81],
    },
    {
      title: "Lysosome",
      desc: "A lysosome is like the garbage collector and recycling center of the cell. It is a small, round sac filled with special chemicals called enzymes that break down waste, old cell parts, and harmful materials.",
      pos: [4.23, 1.78, -0.62],
    },
    {
      title: "Centrioles",
      desc: "A cylindrical cell structure composed mainly of a protein called tubulin. Centrioles are involved in the organization of the mitotic spindle and in the completion of cytokinesis (where the cytoplasm of a single eukaryotic cell is divided).",
      pos: [-2, 2.16, 4.34],
    },
  ],
  plant: [
    {
      title: "Cell Wall",
      desc: "The cell wall is a strong, rigid outer layer found outside the plasma membrane in plant cells. It gives the cell its shape, provides support and protection, and prevents the cell from bursting when it absorbs too much water. The cell wall is made mostly of a substance called cellulose, which makes it strong enough to support the entire plant.",
      pos: [-2.78, -0.38, 6.18],
    },
    {
      title: "Cell (Plasma) Membrane",
      desc: "The Plasma membrane is a thin, flexible layer that surrounds the cell and separates it from its surroundings. Its main job is to protect the cell and control what enters and leaves the cell, such as nutrients, water, oxygen, and waste materials. By allowing only certain substances to pass through, the cell membrane helps maintain a stable environment inside the cell so it can function properly.",
      pos: [-5.35, 0.07, 3],
    },
    {
      title: "Nucleus",
      desc: "The control center of the cell. Bounded by a nuclear envelope, it stores the DNA and directs cell activities such as growth, metabolism, and reproduction.",
      pos: [0.64, 0.86, 3.63],
    },
    {
      title: "Nucleolus",
      desc: "A dense body within the nucleus that produces ribosomal RNA and assembles the subunits of ribosomes.",
      pos: [0.84, 0.02, 3.87],
    },
    {
      title: "DNA",
      desc: "Deoxyribonucleic acid — the molecule that stores the cell's genetic instructions. Coiled with proteins into chromosomes inside the nucleus, it carries the code for building every protein the cell needs.",
      pos: [0.72, -0.04, 4.79],
    },
    {
      title: "Chloroplast",
      desc: "The site of photosynthesis. These green organelles contain chlorophyll, which captures light energy to convert carbon dioxide and water into glucose and oxygen.",
      pos: [-3.77, 0.29, 3.74],
    },
    {
      title: "Central Vacuole",
      desc: "A large fluid-filled sac that can fill most of the cell's volume. It stores water, nutrients, and waste, and its internal (turgor) pressure keeps the cell firm and supports the plant.",
      pos: [-1.08, 1.42, -0.08],
    },
    {
      title: "Mitochondrion",
      desc: "The powerhouse of the cell. It releases energy from glucose through aerobic respiration to produce ATP for cellular work.",
      pos: [-3.93, 0.07, -1.59],
    },
    {
      title: "Rough Endoplasmic Reticulum",
      desc: "A ribosome-covered membrane network that synthesizes and folds proteins for use inside the cell or for export.",
      pos: [-1.34, -0.57, 3.65],
    },
    {
      title: "Smooth Endoplasmic Reticulum",
      desc: "A ribosome-free membrane network that makes lipids, stores calcium ions, and helps process carbohydrates.",
      pos: [-1.26, -0.17, 5.9],
    },
    {
      title: "Golgi Apparatus",
      desc: "A stack of membrane sacs (also called dictyosomes in plants) that modifies, sorts, and packages proteins and lipids into vesicles for transport.",
      pos: [3.71, 1.08, 0.73],
    },
    {
      title: "Ribosomes",
      desc: "Sites of protein synthesis that translate mRNA into proteins. They occur freely in the cytoplasm or attached to the rough ER.",
      pos: [-0.88, -0.2, 4.98],
    },
    {
      title: "Cytoplasm (Cytosol)",
      desc: "The gel-like fluid that fills the cell and holds the organelles, providing the medium for the cell's many chemical reactions.",
      pos: [2.76, -0.07, 1.11],
    },
    {
      title: "Centrioles",
      desc: "Paired cylindrical bundles of microtubules that help organize the spindle during cell division. Note: most higher plant cells lack centrioles and organize their spindles without them — they are shown here as modeled.",
      pos: [0.39, 1.14, -3.82],
    },
    {
      title: "Plasmodesmata",
      desc: "Plasmodesmata are tiny channels that connect neighboring plant cells through their cell walls. These channels allow water, nutrients, sugars, and chemical messages to pass directly from one cell to another, helping plant cells communicate and work together to support the growth and survival of the plant.",
      pos: [4.48, -0.97, 5.27],
      img: "/assets/plasmodesmata.png",
    },
  ],
};

/**
 * Extra organelles to add that the base model lacks. Same coordinate space as
 * annotations. Empty until you tell me which ones you want added as new meshes.
 */
export const EXTRAS: Record<CellType, ExtraOrganelle[]> = {
  animal: [
    // orange highlight for the lysosome (per request)
    { id: "lysosome", label: "Lysosome", color: 0xff8c1a, shape: "sphere", size: 0.5, pos: [4.23, 1.78, -0.62] },
  ],
  plant: [],
};
