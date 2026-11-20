# The Enchanted Vintage Christmas Tree

A small creative-coding project that reimagines a traditional Christmas tree as an animated composition of glowing pixels and particles.

The scene gradually comes to life with deep-green branches, vintage ornaments, golden garlands, warm lights, falling snow, colourful presents, and a handwritten Christmas message. The result is intentionally stylised and digital, combining the nostalgic atmosphere of an old-fashioned Christmas with a generative WebGL aesthetic.

<img width="622" height="847" alt="The Enchanted Vintage Christmas Tree" src="https://github.com/user-attachments/assets/ca691bfb-fbcb-4b85-bfed-fce6765e1a7b" />

## The experience

The animation begins with particles gathering to form the tree and its branches. Decorations, lights, garlands, presents, and the glowing star then appear progressively until the complete scene is revealed.

Visitors can gently explore the tree, play the instrumental soundtrack, and activate the **Make a Wish** effect for an additional burst of light and particles.

## Features

- Procedurally generated tree made from animated WebGL particles
- Dark vintage Christmas colour palette
- Warm golden garlands and fairy lights
- Pixel-based ornaments and presents
- Animated falling snow
- Progressive tree-construction sequence
- Gentle interactive camera movement
- Repeatable **Make a Wish** animation
- Instrumental soundtrack with play and pause controls
- Responsive full-screen presentation

## Built with

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- React Three Drei
- React Three Postprocessing

## Run locally

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Hiba-Asmaa-ElAtifi/enchanted-vintage-christmas-tree.git
cd enchanted-vintage-christmas-tree
npm install
npm run dev
```

Open the local address displayed by Vite, usually:

```text
http://localhost:5173
```

## Create a production build

```bash
npm run build
```

The generated production files will be available in the `dist` directory.

## Music

The instrumental soundtrack is stored at:

```text
public/audio/carol-of-the-bells.mp3
```

Modern browsers require a user interaction before playing audio, so the soundtrack starts when the visitor activates the music control.

## Project note

This is a small personal experiment created to explore particle animation, procedural composition, interactive WebGL, and the visual atmosphere of vintage Christmas decorations.
