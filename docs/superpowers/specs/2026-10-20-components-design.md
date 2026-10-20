# Components: a library of the user's own creations, inside Inspo

Date: 2026-10-20 · Status: ready for approval

## Intent

Inspo collects what the user *sees*. Components holds what they *make*. The user
wants to stop only hoarding inspiration and start building reusable pieces from
it, growing a personal library over time, like the personal libraries other
designers keep. The model is 21st.dev's component pages (content, not visuals):
a live component, its title, description and tags, and one-click copy of a
prompt and the React code.

The first component will be a background shader: a soft dot grid over a blurred
image or gradient (from an inspo the user saved), with controls for the
background image, dot size, dot colour and similar, tweaked live, then copied.

## Who and how

- One person, a designer, who builds components **by prompting Claude** in a chat
  like this one ("make this dotted-glass effect, with controls for dot size and
  colour"). Claude writes the component into this project. Pasting in code from
  elsewhere is explicitly not the flow.
- Copied code goes into the user's work: React or Next.js projects.

## Goals

1. An app switcher: the "Inspo" name at the top of the sidebar becomes a dropdown
   with **Inspo** and **Components** (with counts). The last-used app is
   remembered on that device.
2. A Components grid that reuses Inspo's look and motion: each card **is the
   component, running live** (not a screenshot).
3. Opening a component uses **layout A** (chosen by the user): live preview on
   the left; a side panel with title, description, tags, **controls**, and
   **Copy prompt** / **Copy code**. Same open/close, keyboard and phone behaviour
   as Inspo's opened view.
4. Controls change the live preview instantly. Copying uses the current settings.
5. Tags on components, shown in the sidebar like Inspo's, and searchable along
   with titles and descriptions.
6. Components are included in the shared gallery, so others can browse, tweak
   and copy them too.

## Non-goals

- No link from a component back to the inspo that sparked it (user said no).
- No pasting or uploading arbitrary code into the app.
- No in-app editor for a component's code.
- No picking a saved inspo as a component's background (user chose: a file
  from the computer plus built-in gradients is enough).

## Anti-goals (would make it a failure even if it works)

- Copied code that doesn't run when pasted into a React/Next.js project, or that
  needs extra packages the user has to work out.
- Cards that are static thumbnails; the point is that they're alive.
- Components that tank performance when many are running in the grid.

## Decisions (user's)

- Layout A for the opened view.
- Built by prompting Claude, not by pasting code.
- No link back to inspos.
- Image controls: a file from the computer plus a few built-in gradients.
- Target: React and Next.js.

## Decisions (Claude's calls, for the user to check)

- **Where components live:** as code in this project (one folder per component),
  saved to GitHub with everything else, not in the iCloud folder. They're
  therefore public on GitHub, like the rest of the app's code.
- **Copied code:** a single self-contained `.tsx` file: `"use client"` at the
  top so it works in Next.js, no dependencies beyond React, styling inline or
  in a `<style>` tag (no Tailwind requirement). Shaders use plain WebGL or CSS,
  not three.js. The current control values are written into the code as the
  component's default props.
- **Copied prompt:** plain language describing the effect and the current
  settings, written so it can be pasted into Claude to recreate or adapt it.
- **Control types:** slider (number with min/max/step), colour, choice
  (dropdown), on/off, text, and image.
- **Built-in backgrounds:** a few gradients made in code (no image files, so
  nothing licensed or personal is published). Copied code with a gradient
  chosen works as-is, because the gradient is written into the code.
- **Images in copied code:** when an image is chosen (uploaded or otherwise),
  the copied code uses a placeholder path (`/your-image.jpg`) with a comment
  saying to replace it, and falls back to the gradient if the image is missing,
  so pasted code always runs.
- **Tags:** set when the component is made (the user asks Claude to change them).
  Editing a component's tags inside the app is left out of this first version.
- **Performance:** cards only animate while on screen and pause when scrolled
  away; the grid caps how many run at once on phones.
- **Phones:** same as Inspo: the opened view stacks preview over panel; tags
  become swipeable chips.
- **Search and type filter:** each app searches its own items (searching in
  Components finds components); the All / Images / Videos switch is Inspo-only
  and hidden in Components.

## What's left to the builder

- How a component declares its controls, defaults, prompt and metadata, and how
  the copied code gets the current values written in, as long as each
  component stays one self-contained file a user could read.
- How the app finds components (e.g. a folder convention).
- Exact card aspect ratio and grid density.
- Building the first component (Dotted glass) to prove the whole loop.

## Constraints

- Lives in the existing app (React 19, Vite, shadcn preset b3bEx3aBk2, motion),
  runs on the Mac and in the published read-only gallery (Cloudflare static
  hosting; no server code for this feature).
- Everything stays free.
- The repo is public: no personal details in component files.
